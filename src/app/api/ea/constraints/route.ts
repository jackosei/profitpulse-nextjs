/**
 * GET /api/ea/constraints — discipline limits for EA-side enforcement.
 *
 * Auth: per-pulse API key in the X-API-Key header.
 *
 * The EA polls this when a new position opens and warns the trader in the
 * terminal (FTMO-Mentor-style) when the position's risk breaches the
 * pulse's limits or active caps. Read-only; no Firestore writes so the EA
 * can poll freely.
 */

import { NextResponse } from "next/server";
import { verifyApiKey } from "@/services/apiKeyAuth";
import { loadPulseByDocId } from "@/services/tradeIngestion";
import { isPulseLocked } from "@/types/pulse";
import { getZone } from "@/lib/disciplineEngine";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const auth = await verifyApiKey(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ctx = await loadPulseByDocId(auth.pulseFirestoreId);
    if (!ctx || ctx.pulse.userId !== auth.userId) {
      return NextResponse.json({ error: "Pulse not found" }, { status: 404 });
    }

    const { pulse } = ctx;
    const discipline = pulse.discipline;
    const today = new Date().toISOString().split("T")[0];
    const score = discipline?.disciplineScore ?? 100;

    return NextResponse.json({
      success: true,
      data: {
        accountSize: pulse.accountSize,
        maxRiskPerTrade: pulse.maxRiskPerTrade,
        maxDailyDrawdown: pulse.maxDailyDrawdown,
        maxTotalDrawdown: pulse.maxTotalDrawdown,
        maxTradesPerDay: discipline?.maxTradesPerDay ?? null,
        dailyLossToday: Math.abs(pulse.dailyLoss?.[today] ?? 0),
        totalDrawdown: pulse.totalDrawdown ?? 0,
        activeConstraints: discipline?.activeConstraints ?? null,
        disciplineScore: score,
        disciplineZone: getZone(score),
        disciplineState: discipline?.disciplineState ?? "NORMAL",
        locked: isPulseLocked(pulse),
        instrumentPointValues: pulse.instrumentPointValues ?? {},
      },
    });
  } catch (error) {
    console.error("EA constraints error:", error);
    return NextResponse.json(
      { error: "Failed to fetch constraints" },
      { status: 500 },
    );
  }
}
