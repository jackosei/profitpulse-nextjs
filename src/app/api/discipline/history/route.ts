/**
 * GET /api/discipline/history
 *
 * Returns a chronological array of { date, score } data points representing
 * the trader's discipline score over the requested time range.
 *
 * Reads from the `sessions` subcollection (one doc per trading day) instead of
 * scanning `violationLog`. Non-trading days are filled via carry-forward.
 *
 * Query params:
 *   pulseId  (required) — the Pulse's logical ID field
 *   range    (optional) — "7D" | "30D" | "90D" | "1Y" | "ALL" (default: "30D")
 *
 * Auth: Firebase ID token in Authorization header (Bearer <token>)
 *
 * Response: { data: Array<{ date: string; score: number }> }
 */

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/services/admin";
import * as admin from "firebase-admin";
import type { SessionSnapshot } from "@/lib/disciplineTypes";

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

type TimeRange = "7D" | "30D" | "90D" | "1Y" | "ALL";

function getStartDate(range: TimeRange): string | null {
  if (range === "ALL") return null;
  const dayMap: Record<Exclude<TimeRange, "ALL">, number> = {
    "7D": 7, "30D": 30, "90D": 90, "1Y": 365,
  };
  const d = new Date();
  d.setDate(d.getDate() - dayMap[range as Exclude<TimeRange, "ALL">]);
  return d.toISOString().split("T")[0];
}

function fillDateSeries(
  points: Map<string, number>,
  startDate: string,
  endDate: string,
  initialScore: number,
): Array<{ date: string; score: number }> {
  const result: Array<{ date: string; score: number }> = [];
  const cursor = new Date(startDate + "T00:00:00Z");
  const end    = new Date(endDate   + "T00:00:00Z");
  let lastScore = initialScore;

  while (cursor <= end) {
    const dateStr = cursor.toISOString().split("T")[0];
    if (points.has(dateStr)) lastScore = points.get(dateStr)!;
    result.push({ date: dateStr, score: lastScore });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return result;
}

export async function GET(request: NextRequest) {
  try {
    const uid = await verifyAuth(request);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const pulseId = searchParams.get("pulseId");
    const range   = (searchParams.get("range") as TimeRange | null) ?? "30D";

    if (!pulseId) return NextResponse.json({ error: "pulseId is required" }, { status: 400 });

    // Verify ownership
    const pulseSnap = await adminDb
      .collection("pulses")
      .where("id", "==", pulseId)
      .where("userId", "==", uid)
      .limit(1)
      .get();

    if (pulseSnap.empty) return NextResponse.json({ error: "Pulse not found" }, { status: 404 });

    const firestoreId = pulseSnap.docs[0].id;
    const today       = new Date().toISOString().split("T")[0];
    const startDate   = getStartDate(range) ?? "2020-01-01";

    // One query: sessions in range, ordered by date
    const sessionsSnap = await adminDb
      .collection("pulses")
      .doc(firestoreId)
      .collection("sessions")
      .where("date", ">=", startDate)
      .where("date", "<=", today)
      .orderBy("date", "asc")
      .get();

    const scoreByDate = new Map<string, number>();
    for (const doc of sessionsSnap.docs) {
      const s = doc.data() as SessionSnapshot;
      scoreByDate.set(s.date, s.disciplineScoreAfter);
    }

    // Baseline: last session doc before the window (score just before period started)
    const beforeSnap = await adminDb
      .collection("pulses")
      .doc(firestoreId)
      .collection("sessions")
      .where("date", "<", startDate)
      .orderBy("date", "desc")
      .limit(1)
      .get();

    const initialScore: number = beforeSnap.empty
      ? 100
      : (beforeSnap.docs[0].data() as SessionSnapshot).disciplineScoreAfter;

    const series = fillDateSeries(scoreByDate, startDate, today, initialScore);

    return NextResponse.json({ data: series });

  } catch (error) {
    console.error("[discipline/history] Error:", error);
    return NextResponse.json({ error: "Failed to fetch discipline history" }, { status: 500 });
  }
}
