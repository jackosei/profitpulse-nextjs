/**
 * POST /api/discipline/reflect
 *
 * Reflection gate endpoint. Called when the trader completes the reflection
 * gate after a lockout or daily drawdown violation.
 *
 * Request body: { pulseId, userId, reflection }
 * Auth: Firebase ID token in Authorization header
 *
 * Flow:
 *  1. Verify auth
 *  2. Validate reflection (≥ 50 characters)
 *  3. Set reflectionGatePending = false
 *  4. Award +5 recovery points
 *  5. Recompute state
 *  6. Return updated score + state
 */

import { NextResponse } from "next/server";
import { adminDb } from "@/services/admin";
import * as admin from "firebase-admin";
import type { Pulse } from "@/types/pulse";
import { getZone } from "@/lib/disciplineEngine";
import { computeStateTransition } from "@/lib/enforcementEngine";

// ---------------------------------------------------------------------------
// Auth helper (shared pattern with evaluate route)
// ---------------------------------------------------------------------------

async function verifyAuth(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    const decoded = await admin.auth().verifyIdToken(token);
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
    const authenticatedUid = await verifyAuth(request);
    if (!authenticatedUid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { pulseId, userId, reflection } = body as {
      pulseId: string;
      userId: string;
      reflection: string;
    };

    if (authenticatedUid !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate reflection length
    if (!reflection || reflection.trim().length < 50) {
      return NextResponse.json(
        { error: "Reflection must be at least 50 characters" },
        { status: 400 },
      );
    }

    // Read Pulse
    const pulsesSnap = await adminDb
      .collection("pulses")
      .where("id", "==", pulseId)
      .where("userId", "==", userId)
      .limit(1)
      .get();

    if (pulsesSnap.empty) {
      return NextResponse.json({ error: "Pulse not found" }, { status: 404 });
    }

    const pulseDoc = pulsesSnap.docs[0];
    const pulseData = pulseDoc.data() as Pulse;
    const firestoreId = pulseDoc.id;
    const discipline = pulseData.discipline;

    if (!discipline?.reflectionGatePending) {
      return NextResponse.json(
        { error: "No reflection gate is pending" },
        { status: 400 },
      );
    }

    // Award +5 recovery and clear gate
    const REFLECTION_GATE_RECOVERY = 5;
    const currentScore = discipline.disciplineScore ?? 100;
    const newScore = Math.min(100, currentScore + REFLECTION_GATE_RECOVERY);
    const newZone = getZone(newScore);
    const currentConstraints = discipline.activeConstraints ?? {
      riskCapPct: null,
      tradeCapCount: null,
      lockoutUntil: null,
      noTradeDays: 0,
    };
    const newState = computeStateTransition(
      discipline.disciplineState ?? "NORMAL",
      newScore,
      currentConstraints,
    );

    // Write reflection + clear gate
    await adminDb
      .collection("pulses")
      .doc(firestoreId)
      .update({
        "discipline.reflectionGatePending": false,
        "discipline.disciplineScore": newScore,
        "discipline.disciplineState": newState,
      });

    // Store reflection as a document in the violation log
    await adminDb
      .collection("pulses")
      .doc(firestoreId)
      .collection("violationLog")
      .add({
        timestamp: admin.firestore.Timestamp.now(),
        type: "REFLECTION_GATE_COMPLETED",
        reflection: reflection.trim(),
        scoreBefore: currentScore,
        scoreAfter: newScore,
        zone: newZone,
      });

    return NextResponse.json({
      success: true,
      data: {
        newScore,
        newZone,
        newState,
        reflectionGatePending: false,
      },
    });
  } catch (error) {
    console.error("Reflection gate error:", error);
    return NextResponse.json(
      {
        error: "Failed to process reflection",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
