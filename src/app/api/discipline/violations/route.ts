/**
 * GET /api/discipline/violations
 *
 * Returns violation log entries from the `pulses/{pulseId}/violationLog`
 * subcollection, ordered by timestamp descending.
 *
 * Query params:
 *   pulseId  — required
 *   sessionDate — optional YYYY-MM-DD filter
 *   limit    — optional, default 50, max 200
 *
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

export async function GET(request: Request) {
  try {
    const authenticatedUid = await verifyAuth(request);
    if (!authenticatedUid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pulseId = searchParams.get("pulseId");
    const sessionDate = searchParams.get("sessionDate") ?? undefined;
    const limitParam = parseInt(searchParams.get("limit") ?? "50", 10);
    const limit = Math.min(Math.max(limitParam, 1), 200);

    if (!pulseId) {
      return NextResponse.json({ error: "pulseId is required" }, { status: 400 });
    }

    // Verify pulse belongs to the authenticated user
    const pulseSnap = await adminDb
      .collection("pulses")
      .where("id", "==", pulseId)
      .where("userId", "==", authenticatedUid)
      .limit(1)
      .get();

    if (pulseSnap.empty) {
      return NextResponse.json({ error: "Pulse not found" }, { status: 404 });
    }

    const pulseDocId = pulseSnap.docs[0].id;

    let query = adminDb
      .collection("pulses")
      .doc(pulseDocId)
      .collection("violationLog")
      .orderBy("timestamp", "desc")
      .limit(limit) as FirebaseFirestore.Query;

    if (sessionDate) {
      query = query.where("sessionDate", "==", sessionDate);
    }

    const snap = await query.get();
    const entries = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      // Convert Firestore Timestamp to ISO string for JSON serialisation
      timestamp: doc.data().timestamp?.toDate?.()?.toISOString() ?? null,
    }));

    return NextResponse.json({ success: true, data: entries });
  } catch (error) {
    console.error("Violations fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch violations" }, { status: 500 });
  }
}
