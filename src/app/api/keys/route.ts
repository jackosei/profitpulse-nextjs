/**
 * /api/keys — per-pulse API key management for the MT5 sync EA.
 *
 * POST   { pulseFirestoreId, label? } → create a key (revokes any previous
 *        key for the pulse). Returns the raw key ONCE.
 * GET    ?pulseFirestoreId=…          → active-key metadata (never the key).
 * DELETE { pulseFirestoreId }         → revoke (disconnect).
 *
 * Auth: Firebase ID token in Authorization header (same pattern as the
 * other API routes). Ownership is enforced against pulses/{id}.userId.
 */

import { NextResponse } from "next/server";
import * as admin from "firebase-admin";
import { adminDb } from "@/services/admin";
import {
  createApiKey,
  revokeApiKeysForPulse,
  getActiveKeyForPulse,
} from "@/services/apiKeyAuth";

export const runtime = "nodejs";

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

/** Resolve + authorize the pulse; returns null if not found or not owned. */
async function authorizePulse(
  pulseFirestoreId: string,
  uid: string,
): Promise<boolean> {
  if (!pulseFirestoreId) return false;
  const doc = await adminDb.collection("pulses").doc(pulseFirestoreId).get();
  return doc.exists && doc.data()?.userId === uid;
}

export async function POST(request: Request) {
  try {
    const uid = await verifyAuth(request);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { pulseFirestoreId, label } = (await request.json()) as {
      pulseFirestoreId: string;
      label?: string;
    };

    if (!(await authorizePulse(pulseFirestoreId, uid))) {
      return NextResponse.json({ error: "Pulse not found" }, { status: 404 });
    }

    const { rawKey, prefix } = await createApiKey(
      uid,
      pulseFirestoreId,
      label ?? "MT5 EA",
    );

    return NextResponse.json({ success: true, data: { key: rawKey, prefix } });
  } catch (error) {
    console.error("API key create error:", error);
    return NextResponse.json({ error: "Failed to create API key" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const uid = await verifyAuth(request);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const pulseFirestoreId =
      new URL(request.url).searchParams.get("pulseFirestoreId") ?? "";

    if (!(await authorizePulse(pulseFirestoreId, uid))) {
      return NextResponse.json({ error: "Pulse not found" }, { status: 404 });
    }

    const key = await getActiveKeyForPulse(uid, pulseFirestoreId);
    return NextResponse.json({ success: true, data: { key } });
  } catch (error) {
    console.error("API key info error:", error);
    return NextResponse.json({ error: "Failed to fetch API key" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const uid = await verifyAuth(request);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { pulseFirestoreId } = (await request.json()) as {
      pulseFirestoreId: string;
    };

    if (!(await authorizePulse(pulseFirestoreId, uid))) {
      return NextResponse.json({ error: "Pulse not found" }, { status: 404 });
    }

    const revoked = await revokeApiKeysForPulse(uid, pulseFirestoreId);
    return NextResponse.json({ success: true, data: { revoked } });
  } catch (error) {
    console.error("API key revoke error:", error);
    return NextResponse.json({ error: "Failed to revoke API key" }, { status: 500 });
  }
}
