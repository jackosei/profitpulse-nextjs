/**
 * Per-pulse API keys for non-interactive clients (the MT5 sync EA, and any
 * future broker/webhook integration).
 *
 * Storage: apiKeys/{sha256(rawKey)} — the doc id IS the hash, so lookup is
 * a single O(1) doc get and the raw key is never stored. The raw key
 * (`pp_live_<32 random bytes, base64url>`) is shown to the user exactly
 * once at creation.
 *
 * One active key per pulse: a pulse maps to one broker account, and
 * creating a new key revokes any previous keys for that pulse.
 */

import { createHash, randomBytes } from "crypto";
import * as admin from "firebase-admin";
import { adminDb } from "@/services/admin";

const COLLECTION = "apiKeys";
const KEY_PREFIX = "pp_live_";

export interface ApiKeyRecord {
  userId: string;
  pulseFirestoreId: string;
  /** First characters of the raw key, for display ("pp_live_Ab3…"). */
  prefix: string;
  label: string;
  createdAt: admin.firestore.Timestamp;
  lastUsedAt: admin.firestore.Timestamp | null;
  revoked: boolean;
}

export interface VerifiedApiKey {
  keyHash: string;
  userId: string;
  pulseFirestoreId: string;
}

function hashKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

/**
 * Create a key for a pulse, revoking any existing keys for it.
 * Returns the raw key — the only time it is ever available.
 */
export async function createApiKey(
  userId: string,
  pulseFirestoreId: string,
  label: string,
): Promise<{ rawKey: string; prefix: string }> {
  await revokeApiKeysForPulse(userId, pulseFirestoreId);

  const rawKey = KEY_PREFIX + randomBytes(32).toString("base64url");
  const prefix = rawKey.slice(0, KEY_PREFIX.length + 6);

  const record: ApiKeyRecord = {
    userId,
    pulseFirestoreId,
    prefix,
    label,
    createdAt: admin.firestore.Timestamp.now(),
    lastUsedAt: null,
    revoked: false,
  };

  await adminDb.collection(COLLECTION).doc(hashKey(rawKey)).set(record);
  return { rawKey, prefix };
}

/**
 * Resolve the `X-API-Key` header to its owner. Returns null for missing,
 * unknown, or revoked keys — callers respond 401.
 */
export async function verifyApiKey(
  request: Request,
): Promise<VerifiedApiKey | null> {
  const rawKey = request.headers.get("X-API-Key");
  if (!rawKey || !rawKey.startsWith(KEY_PREFIX)) return null;

  const keyHash = hashKey(rawKey);
  const doc = await adminDb.collection(COLLECTION).doc(keyHash).get();
  if (!doc.exists) return null;

  const record = doc.data() as ApiKeyRecord;
  if (record.revoked) return null;

  return { keyHash, userId: record.userId, pulseFirestoreId: record.pulseFirestoreId };
}

/** Record key activity — called from the sync webhook, not the poll routes. */
export async function touchApiKey(keyHash: string): Promise<void> {
  await adminDb.collection(COLLECTION).doc(keyHash).update({
    lastUsedAt: admin.firestore.Timestamp.now(),
  });
}

/** Revoke every key attached to a pulse (disconnect / key rotation). */
export async function revokeApiKeysForPulse(
  userId: string,
  pulseFirestoreId: string,
): Promise<number> {
  const snap = await adminDb
    .collection(COLLECTION)
    .where("userId", "==", userId)
    .where("pulseFirestoreId", "==", pulseFirestoreId)
    .where("revoked", "==", false)
    .get();

  if (snap.empty) return 0;
  const batch = adminDb.batch();
  for (const doc of snap.docs) {
    batch.update(doc.ref, { revoked: true });
  }
  await batch.commit();
  return snap.size;
}

/** Active-key metadata for the connect-flow UI (never the key itself). */
export async function getActiveKeyForPulse(
  userId: string,
  pulseFirestoreId: string,
): Promise<Pick<ApiKeyRecord, "prefix" | "label" | "createdAt" | "lastUsedAt"> | null> {
  const snap = await adminDb
    .collection(COLLECTION)
    .where("userId", "==", userId)
    .where("pulseFirestoreId", "==", pulseFirestoreId)
    .where("revoked", "==", false)
    .limit(1)
    .get();

  if (snap.empty) return null;
  const { prefix, label, createdAt, lastUsedAt } = snap.docs[0].data() as ApiKeyRecord;
  return { prefix, label, createdAt, lastUsedAt };
}
