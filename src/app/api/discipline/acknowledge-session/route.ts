/**
 * POST /api/discipline/acknowledge-session
 *
 * Records that the trader has acknowledged today's active constraints via
 * the SessionGate UI. Writes `discipline.sessionGateAckDate = calendarToday`
 * to the Pulse document so the evaluate route can verify it server-side.
 *
 * Request body: { pulseId, userId }
 * Auth: Firebase ID token in Authorization header
 */

import { NextResponse } from "next/server";
import { adminDb } from "@/services/admin";
import * as admin from "firebase-admin";

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

export async function POST(request: Request) {
  try {
    const authenticatedUid = await verifyAuth(request);
    if (!authenticatedUid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { pulseId, userId } = body as { pulseId: string; userId: string };

    if (authenticatedUid !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const pulsesSnap = await adminDb
      .collection("pulses")
      .where("id", "==", pulseId)
      .where("userId", "==", userId)
      .limit(1)
      .get();

    if (pulsesSnap.empty) {
      return NextResponse.json({ error: "Pulse not found" }, { status: 404 });
    }

    const calendarToday = new Date().toISOString().split("T")[0];

    await adminDb
      .collection("pulses")
      .doc(pulsesSnap.docs[0].id)
      .update({ "discipline.sessionGateAckDate": calendarToday });

    return NextResponse.json({ success: true, ackedDate: calendarToday });
  } catch (error) {
    console.error("Acknowledge session error:", error);
    return NextResponse.json({ error: "Failed to acknowledge session" }, { status: 500 });
  }
}
