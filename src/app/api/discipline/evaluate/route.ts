/**
 * POST /api/discipline/evaluate
 *
 * Phase 2 server-side discipline evaluation endpoint.
 * All violation detection, score mutation, and trade persistence runs in
 * the shared ingestion service (src/services/tradeIngestion.ts) — this
 * route is the interactive (trade form) entry point to it. The EA sync
 * webhook enters the same service in "import" mode.
 * The client MUST NOT compute discipline state — it only reads it.
 *
 * Request body: { pulseId, userId, tradeData, noTradeDayAck?, capAck? }
 * Auth: Firebase ID token in Authorization header
 *
 * Response contract (status codes + payload shapes) is frozen — the trade
 * form and gate UIs depend on it.
 */

import { NextResponse, after } from "next/server";
import * as admin from "firebase-admin";
import type { TradeCreateData } from "@/services/api/pulseApi";
import { loadPulseByHumanId, ingestTrade } from "@/services/tradeIngestion";
import { getPostHogClient } from "@/lib/posthog-server";

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

async function verifyAuth(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    const decoded = await admin.auth().verifyIdToken(token, true);
    return decoded.uid;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────
    const authenticatedUid = await verifyAuth(request);
    if (!authenticatedUid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { pulseId, userId, tradeData, noTradeDayAck, capAck } = body as {
      pulseId: string;
      userId: string;
      tradeData: TradeCreateData;
      noTradeDayAck?: boolean;
      capAck?: boolean;
    };

    // Verify the authenticated user matches the request
    if (authenticatedUid !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── Read Pulse ─────────────────────────────────────────────────────
    const ctx = await loadPulseByHumanId(pulseId, userId);
    if (!ctx) {
      return NextResponse.json({ error: "Pulse not found" }, { status: 404 });
    }

    // ── Ingest (gates, validation, engine, persistence) ────────────────
    const result = await ingestTrade(
      ctx,
      { tradeData, noTradeDayAck, capAck },
      { mode: "interactive" },
    );

    if (!result.ok) {
      return NextResponse.json(result.payload, { status: result.status });
    }

    // ── Server-side analytics ──────────────────────────────────────────
    if (result.violations.length > 0) {
      const posthog = getPostHogClient();
      posthog.capture({
        distinctId: authenticatedUid,
        event: "discipline_violation_occurred",
        properties: {
          pulseId,
          violationCount: result.violations.length,
          violationTypes: result.violations.map((v) => v.type),
          newScore: result.newScore,
          newZone: result.newZone,
          newState: result.newState,
        },
      });
      // Flush after the response streams (serverless-safe delivery).
      after(async () => { await posthog.flush() });
    }

    // ── Response ───────────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      data: {
        trade: result.trade,
        violations: result.violations,
        newScore: result.newScore,
        newZone: result.newZone,
        newState: result.newState,
        activeConstraints: result.activeConstraints,
        isViolationTrade: result.isViolationTrade,
        reflectionGatePending: result.reflectionGatePending,
        consecutiveCleanDays: result.consecutiveCleanDays,
      },
    });
  } catch (error) {
    console.error("Discipline evaluate error:", error);
    return NextResponse.json(
      {
        error: "Failed to evaluate trade",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
