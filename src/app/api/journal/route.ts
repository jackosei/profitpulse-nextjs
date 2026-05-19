import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/services/admin'
import * as admin from 'firebase-admin'
import { utcDayKey } from '@/config/routes'

export const runtime = 'nodejs'

// Cookie outlives a single day so a late-night session isn't re-gated at
// midnight mid-use; the middleware compares the stored day to today's UTC
// day, so staleness still re-gates on the next calendar day.
const COOKIE_MAX_AGE_S = 60 * 60 * 36 // 36h

/** Verify the caller's Firebase ID token; returns the authenticated uid. */
async function verifyAuth(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7), true)
    return decoded.uid
  } catch {
    return null
  }
}

function journalDoc(uid: string, day: string) {
  return adminDb.collection('users').doc(uid).collection('journal').doc(day)
}

export async function GET(request: NextRequest) {
  const uid = await verifyAuth(request)
  if (!uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const day = utcDayKey()
  const snap = await journalDoc(uid, day).get()
  return NextResponse.json({
    journaledToday: snap.exists,
    entry: snap.exists ? (snap.data()?.text ?? '') : '',
  })
}

export async function POST(request: NextRequest) {
  const uid = await verifyAuth(request)
  if (!uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let text: unknown
  try {
    ;({ text } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (typeof text !== 'string' || !text.trim()) {
    return NextResponse.json(
      { error: 'Journal entry is required' },
      { status: 400 },
    )
  }

  const day = utcDayKey()
  const now = admin.firestore.Timestamp.now()
  await journalDoc(uid, day).set(
    { text: text.trim(), day, updatedAt: now, createdAt: now },
    { merge: true },
  )

  const res = NextResponse.json({ success: true })
  res.cookies.set('journaled', day, {
    maxAge: COOKIE_MAX_AGE_S,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })
  return res
}
