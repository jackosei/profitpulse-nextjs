/**
 * POST /api/ea/trades — sync webhook for the ProfitPulse MT5 EA.
 *
 * Auth: per-pulse API key in the X-API-Key header (see /api/keys).
 *
 * Body: {
 *   trades: EaTrade[],        // ≤ MAX_TRADES_PER_REQUEST, chronological
 *   accountNumber?: string,   // broker login, for the sync-status UI
 *   gmtOffsetHours?: number,  // broker-server offset (EA input), default 0
 * }
 *
 * Trades run through the shared ingestion service in "import" mode:
 * duplicates (same MT5 position id) are skipped idempotently, trades dated
 * before the pulse's lastSessionDate are recorded as history without
 * touching live discipline state, and live-era trades run the full engine
 * with gate bounces converted to scored violations. The EA re-posts
 * anything since its last cursor on every scan — that is by design and
 * safe.
 */

import { NextResponse, after } from "next/server";
import * as admin from "firebase-admin";
import { adminDb } from "@/services/admin";
import { verifyApiKey, touchApiKey } from "@/services/apiKeyAuth";
import {
  loadPulseByDocId,
  ingestImportBatch,
} from "@/services/tradeIngestion";
import { normalizeEaTrades, type EaTrade } from "@/lib/import/normalize";
import { getPostHogClient } from "@/lib/posthog-server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_TRADES_PER_REQUEST = 100;

export async function POST(request: Request) {
  try {
    const auth = await verifyApiKey(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      trades?: EaTrade[];
      accountNumber?: string;
      gmtOffsetHours?: number;
    };

    const eaTrades = body.trades ?? [];
    if (!Array.isArray(eaTrades)) {
      return NextResponse.json({ error: "trades must be an array" }, { status: 400 });
    }
    if (eaTrades.length > MAX_TRADES_PER_REQUEST) {
      return NextResponse.json(
        { error: `Too many trades — send at most ${MAX_TRADES_PER_REQUEST} per request` },
        { status: 400 },
      );
    }

    const ctx = await loadPulseByDocId(auth.pulseFirestoreId);
    if (!ctx || ctx.pulse.userId !== auth.userId) {
      return NextResponse.json({ error: "Pulse not found" }, { status: 404 });
    }

    const now = admin.firestore.Timestamp.now();
    const syncBatchId = `ea_${Date.now()}`;
    const calendarToday = new Date().toISOString().split("T")[0];
    // Trades older than the last live session are backfill — record-only for
    // discipline state. Everything from that day forward runs the engine.
    const liveCutoffDate =
      ctx.pulse.discipline?.lastSessionDate ?? calendarToday;

    const normalized = normalizeEaTrades(eaTrades, {
      pulseId: ctx.pulse.id,
      userId: ctx.pulse.userId,
      accountSize: ctx.pulse.accountSize,
      instruments: ctx.pulse.instruments ?? [],
      gmtOffsetHours: body.gmtOffsetHours,
      syncBatchId,
    });

    const result = await ingestImportBatch(
      ctx,
      normalized.map((n) => n.tradeData),
      { liveCutoffDate },
    );

    const unmappedSymbols = [
      ...new Set(
        normalized
          .filter((n) => !n.symbolMatched)
          .map((n) => n.tradeData.brokerSymbol ?? ""),
      ),
    ];

    // Sync heartbeat — even an all-duplicates post proves the EA is alive.
    await adminDb.collection("pulses").doc(ctx.firestoreId).update({
      sync: {
        provider: "ea:mt5",
        lastSyncAt: now,
        ...(body.accountNumber ? { accountNumber: String(body.accountNumber) } : {}),
      },
    });
    await touchApiKey(auth.keyHash);

    if (result.created > 0) {
      const posthog = getPostHogClient();
      posthog.capture({
        distinctId: auth.userId,
        event: "trades_synced",
        properties: {
          pulseId: ctx.pulse.id,
          provider: "ea:mt5",
          created: result.created,
          duplicates: result.duplicates,
          errors: result.errors,
          newScore: result.newScore,
        },
      });
      after(async () => { await posthog.flush() });
    }

    return NextResponse.json({
      success: true,
      data: {
        created: result.created,
        duplicates: result.duplicates,
        errors: result.errors,
        statuses: result.statuses,
        unmappedSymbols,
        newScore: result.newScore,
        newZone: result.newZone,
        lastSyncAt: now.toDate().toISOString(),
      },
    });
  } catch (error) {
    console.error("EA sync error:", error);
    return NextResponse.json(
      {
        error: "Failed to sync trades",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
