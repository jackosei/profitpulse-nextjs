import { NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/services/admin'
import { utcDayKey } from '@/config/routes'
import {
  maybeResetDemo,
  ensureDemoJournalToday,
} from '@/lib/demoSeedWriter'

export const runtime = 'nodejs'

// Matches the journal route's cookie lifetime.
const COOKIE_MAX_AGE_S = 60 * 60 * 36 // 36h

const DEFAULT_RESET_HOURS = 6

/**
 * Demo sign-in. Public — the demo account is intentionally shared.
 *
 * 1. Auto-resets the demo dataset when stale (lease-guarded).
 * 2. Writes today's canned journal entry + sets the `journaled` cookie so the
 *    middleware's daily journal gate doesn't bounce demo visitors.
 * 3. Returns a Firebase custom token; the client signs in with it and the
 *    normal AuthContext flow mints the session cookie.
 */
export async function POST() {
  const demoUid = process.env.DEMO_UID
  if (!demoUid) {
    return NextResponse.json(
      { error: 'Demo account is not configured' },
      { status: 503 },
    )
  }

  const resetHours = Number(process.env.DEMO_RESET_HOURS) || DEFAULT_RESET_HOURS

  try {
    // Stale-data reset (no-op when fresh or another login holds the lease)
    await maybeResetDemo(adminDb, demoUid, resetHours)

    // Journal gate: canned entry + cookie
    const day = utcDayKey()
    await ensureDemoJournalToday(adminDb, demoUid, day)

    const token = await adminAuth.createCustomToken(demoUid)

    const res = NextResponse.json({ token })
    res.cookies.set('journaled', day, {
      maxAge: COOKIE_MAX_AGE_S,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    })
    return res
  } catch (err) {
    console.error('[demo/login] error:', err)
    return NextResponse.json(
      { error: 'Failed to start the demo session' },
      { status: 500 },
    )
  }
}
