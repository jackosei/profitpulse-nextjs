/**
 * Demo account — Firestore reset + seed writer.
 *
 * Server-side only (firebase-admin). Shared by:
 *  - POST /api/demo/login   (throttled auto-reset on demo sign-in)
 *  - scripts/seed-demo-data.ts (manual provisioning / reseed)
 *
 * Reset = delete every pulse owned by the demo uid (including any a visitor
 * created) with subcollections, wipe the journal, then batch-write the
 * canonical dataset from generateDemoData(). Doc IDs are deterministic so a
 * visitor mid-session during a reset recovers on refresh.
 */

import * as admin from "firebase-admin";
import { generateDemoData, DEMO_JOURNAL_TEXT } from "./demoSeed";

const BATCH_LIMIT = 450;
const PULSE_SUBCOLLECTIONS = ["trades", "violationLog", "sessions"];

type Db = admin.firestore.Firestore;

/** Delete all docs matched by a query/collection in pages of 100. */
async function deleteCollection(
  db: Db,
  collRef: FirebaseFirestore.CollectionReference | FirebaseFirestore.Query,
): Promise<void> {
  const snap = await collRef.limit(100).get();
  if (snap.empty) return;

  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();

  if (snap.size === 100) {
    await deleteCollection(db, collRef);
  }
}

async function deletePulseWithSubcollections(
  db: Db,
  docRef: FirebaseFirestore.DocumentReference,
): Promise<void> {
  await Promise.all(
    PULSE_SUBCOLLECTIONS.map((name) => deleteCollection(db, docRef.collection(name))),
  );
  await docRef.delete();
}

/** A self-committing batch that respects Firestore's 500-write limit. */
class BatchWriter {
  private batch: FirebaseFirestore.WriteBatch;
  private count = 0;

  constructor(private db: Db) {
    this.batch = db.batch();
  }

  async set(ref: FirebaseFirestore.DocumentReference, data: Record<string, unknown>) {
    this.batch.set(ref, data);
    this.count += 1;
    if (this.count >= BATCH_LIMIT) {
      await this.batch.commit();
      this.batch = this.db.batch();
      this.count = 0;
    }
  }

  async flush() {
    if (this.count > 0) await this.batch.commit();
  }
}

/**
 * Wipe and re-seed all demo data. Idempotent.
 * Assumes the Auth user for `demoUid` already exists.
 */
export async function resetAndSeedDemo(db: Db, demoUid: string): Promise<void> {
  // 1. Delete every pulse owned by the demo user (seeded or visitor-created)
  const pulsesSnap = await db
    .collection("pulses")
    .where("userId", "==", demoUid)
    .get();
  await Promise.all(
    pulsesSnap.docs.map((doc) => deletePulseWithSubcollections(db, doc.ref)),
  );

  // 2. Wipe the journal so visitor entries don't accumulate
  const userRef = db.collection("users").doc(demoUid);
  await deleteCollection(db, userRef.collection("journal"));

  // 3. Generate + write the canonical dataset
  const data = generateDemoData(new Date(), demoUid, (d) =>
    admin.firestore.Timestamp.fromDate(d),
  );
  const writer = new BatchWriter(db);

  await writer.set(userRef, data.user);

  for (const pulseSeed of data.pulses) {
    const pulseRef = db.collection("pulses").doc(pulseSeed.docId);
    await writer.set(pulseRef, pulseSeed.pulse);

    for (const trade of pulseSeed.trades) {
      await writer.set(pulseRef.collection("trades").doc(trade.docId), trade.data);
    }
    for (const [i, entry] of pulseSeed.violationLog.entries()) {
      await writer.set(
        pulseRef.collection("violationLog").doc(`demo-v${String(i + 1).padStart(2, "0")}`),
        entry,
      );
    }
    for (const session of pulseSeed.sessions) {
      await writer.set(
        pulseRef.collection("sessions").doc(session.docId),
        session.data,
      );
    }
  }

  for (const entry of data.journal) {
    await writer.set(userRef.collection("journal").doc(entry.docId), entry.data);
  }

  await writer.flush();

  // 4. Stamp the reset marker (also releases the lease)
  await userRef.collection("meta").doc("demo").set({
    lastResetAt: admin.firestore.Timestamp.now(),
    resetLeaseUntil: null,
  });
}

/**
 * Reset the demo data if it's stale, guarded by a short lease so concurrent
 * demo logins can't double-seed. Returns true if a reset ran.
 */
export async function maybeResetDemo(
  db: Db,
  demoUid: string,
  maxAgeHours: number,
): Promise<boolean> {
  const metaRef = db
    .collection("users")
    .doc(demoUid)
    .collection("meta")
    .doc("demo");

  const now = admin.firestore.Timestamp.now();
  const staleBefore = admin.firestore.Timestamp.fromMillis(
    now.toMillis() - maxAgeHours * 3600 * 1000,
  );
  const leaseUntil = admin.firestore.Timestamp.fromMillis(
    now.toMillis() + 2 * 60 * 1000,
  );

  const claimed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(metaRef);
    const meta = snap.data();
    const lastResetAt = meta?.lastResetAt as admin.firestore.Timestamp | undefined;
    const lease = meta?.resetLeaseUntil as admin.firestore.Timestamp | null | undefined;

    const fresh = lastResetAt && lastResetAt.toMillis() > staleBefore.toMillis();
    const leaseHeld = lease && lease.toMillis() > now.toMillis();
    if (fresh || leaseHeld) return false;

    tx.set(metaRef, { resetLeaseUntil: leaseUntil }, { merge: true });
    return true;
  });

  if (!claimed) return false;

  try {
    await resetAndSeedDemo(db, demoUid);
    return true;
  } catch (err) {
    // Release the lease so the next login can retry
    await metaRef.set({ resetLeaseUntil: null }, { merge: true }).catch(() => {});
    throw err;
  }
}

/** Upsert today's demo journal entry (satisfies the daily journal gate). */
export async function ensureDemoJournalToday(
  db: Db,
  demoUid: string,
  day: string,
): Promise<void> {
  const now = admin.firestore.Timestamp.now();
  await db
    .collection("users")
    .doc(demoUid)
    .collection("journal")
    .doc(day)
    .set(
      { day, text: DEMO_JOURNAL_TEXT, createdAt: now, updatedAt: now },
      { merge: true },
    );
}
