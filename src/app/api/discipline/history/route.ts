/**
 * GET /api/discipline/history
 *
 * Returns a chronological array of { date, score } data points representing
 * the trader's discipline score over the requested time range, derived from
 * the violationLog subcollection.
 *
 * Query params:
 *   pulseId  (required) — the Pulse's logical ID field
 *   range    (optional) — "7D" | "30D" | "90D" | "1Y" | "ALL" (default: "30D")
 *
 * Auth: Firebase ID token in Authorization header (Bearer <token>)
 *
 * Response: { data: Array<{ date: string; score: number }> }
 *
 * Algorithm:
 *   1. Determine the start date from `range`.
 *   2. Query violationLog entries in that range, ordered by timestamp.
 *   3. Group entries by sessionDate, taking the final `scoreAfter` per day.
 *   4. Fill in days with no violations using the last known score (carry-forward).
 *   5. Return the full date series from startDate to today.
 */

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/services/admin";
import * as admin from "firebase-admin";

// ---------------------------------------------------------------------------
// Auth helper (same pattern as evaluate route)
// ---------------------------------------------------------------------------

async function verifyAuth(request: NextRequest): Promise<string | null> {
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
// Range → start date
// ---------------------------------------------------------------------------

type TimeRange = "7D" | "30D" | "90D" | "1Y" | "ALL";

function getStartDate(range: TimeRange): string | null {
  if (range === "ALL") return null;
  const dayMap: Record<Exclude<TimeRange, "ALL">, number> = {
    "7D": 7,
    "30D": 30,
    "90D": 90,
    "1Y": 365,
  };
  const days = dayMap[range as Exclude<TimeRange, "ALL">] ?? 30;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

// ---------------------------------------------------------------------------
// Fill date gaps with carry-forward score
// ---------------------------------------------------------------------------

function fillDateSeries(
  points: Map<string, number>,
  startDate: string,
  endDate: string,
  initialScore: number,
): Array<{ date: string; score: number }> {
  const result: Array<{ date: string; score: number }> = [];
  const cursor = new Date(startDate + "T00:00:00Z");
  const end = new Date(endDate + "T00:00:00Z");
  let lastScore = initialScore;

  while (cursor <= end) {
    const dateStr = cursor.toISOString().split("T")[0];
    if (points.has(dateStr)) {
      lastScore = points.get(dateStr)!;
    }
    result.push({ date: dateStr, score: lastScore });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return result;
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    // ── Auth ─────────────────────────────────────────────────────────────
    const uid = await verifyAuth(request);
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Params ──────────────────────────────────────────────────────────
    const { searchParams } = new URL(request.url);
    const pulseId = searchParams.get("pulseId");
    const range = (searchParams.get("range") as TimeRange | null) ?? "30D";

    if (!pulseId) {
      return NextResponse.json({ error: "pulseId is required" }, { status: 400 });
    }

    // ── Verify pulse ownership ───────────────────────────────────────────
    const pulseSnap = await adminDb
      .collection("pulses")
      .where("id", "==", pulseId)
      .where("userId", "==", uid)
      .limit(1)
      .get();

    if (pulseSnap.empty) {
      return NextResponse.json({ error: "Pulse not found" }, { status: 404 });
    }

    const pulseDoc = pulseSnap.docs[0];
    const firestoreId = pulseDoc.id;
    const pulseData = pulseDoc.data();
    const currentScore: number = pulseData?.discipline?.disciplineScore ?? 100;

    // ── Determine date range ─────────────────────────────────────────────
    const today = new Date().toISOString().split("T")[0];
    const startDate = getStartDate(range) ?? "2020-01-01"; // ALL: from beginning

    // ── Query violation log ──────────────────────────────────────────────
    const query = adminDb
      .collection("pulses")
      .doc(firestoreId)
      .collection("violationLog")
      .where("sessionDate", ">=", startDate)
      .where("sessionDate", "<=", today)
      .orderBy("sessionDate", "asc")
      .orderBy("timestamp", "asc");

    const logSnap = await query.get();

    // ── Build score map: sessionDate → final scoreAfter that day ──────────
    const scoreByDate = new Map<string, number>();
    for (const doc of logSnap.docs) {
      const entry = doc.data() as { sessionDate: string; scoreAfter: number };
      // Later entries within the same day overwrite earlier ones (we want end-of-day)
      scoreByDate.set(entry.sessionDate, entry.scoreAfter);
    }

    // ── Fill date series with carry-forward ──────────────────────────────
    // The starting score is the current pulse score (best proxy when no violations exist)
    const series = fillDateSeries(scoreByDate, startDate, today, currentScore);

    return NextResponse.json({ data: series });

  } catch (error) {
    console.error("[discipline/history] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch discipline history" },
      { status: 500 },
    );
  }
}
