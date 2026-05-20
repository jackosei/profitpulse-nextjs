import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/services/admin';
import { DEFAULT_USER_ROLE, type UserProfile } from '@/types/user';

export const runtime = 'nodejs';

/**
 * Verify the caller's Firebase ID token (Authorization: Bearer <token>).
 * Returns the authenticated uid, or null if the token is missing/invalid.
 */
async function verifyAuth(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const decoded = await adminAuth.verifyIdToken(token, true);
    return decoded.uid;
  } catch {
    return null;
  }
}

/** GET — return the authenticated user's own profile. */
export async function GET(request: Request) {
  const uid = await verifyAuth(request);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const snap = await adminDb.collection('users').doc(uid).get();
  if (!snap.exists) {
    return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
  }
  return NextResponse.json({ profile: snap.data() as UserProfile });
}

/**
 * POST — create the authenticated user's own profile if it doesn't exist.
 * The role is ALWAYS forced to the default ('user') server-side; a client
 * can never self-assign a privileged role. Idempotent: if a profile already
 * exists it is returned unchanged (no role downgrade/escalation).
 */
export async function POST(request: Request) {
  const uid = await verifyAuth(request);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { email, displayName } = body as {
    email?: string;
    displayName?: string | null;
  };

  const userRef = adminDb.collection('users').doc(uid);
  const existing = await userRef.get();
  if (existing.exists) {
    return NextResponse.json({ profile: existing.data() as UserProfile });
  }

  const now = new Date().toISOString();
  const profile: UserProfile = {
    id: uid,
    email: email ?? '',
    displayName: displayName ?? (email ? email.split('@')[0] : null),
    role: DEFAULT_USER_ROLE,
    createdAt: now,
    updatedAt: now,
  };
  await userRef.set(profile);
  return NextResponse.json({ profile }, { status: 201 });
}

/**
 * PATCH — update the authenticated user's own mutable profile fields.
 * Only displayName is mutable here; role/email/createdAt are immutable
 * via this endpoint (role changes go through admin-only paths).
 */
export async function PATCH(request: Request) {
  const uid = await verifyAuth(request);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { displayName } = body as { displayName?: string | null };

  const userRef = adminDb.collection('users').doc(uid);
  const existing = await userRef.get();
  if (!existing.exists) {
    return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
  }

  await userRef.update({
    displayName: displayName ?? null,
    updatedAt: new Date().toISOString(),
  });
  const updated = await userRef.get();
  return NextResponse.json({ profile: updated.data() as UserProfile });
}
