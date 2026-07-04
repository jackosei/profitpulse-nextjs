import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/services/admin';

export const runtime = 'nodejs';

const EXPIRES_IN_MS = 60 * 60 * 24 * 5 * 1000; // 5 days

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    await adminAuth.verifyIdToken(token, true);
    const sessionCookie = await adminAuth.createSessionCookie(token, {
      expiresIn: EXPIRES_IN_MS,
    });

    const res = NextResponse.json({ success: true });
    res.cookies.set('session', sessionCookie, {
      maxAge: EXPIRES_IN_MS / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return res;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set('session', '', { maxAge: 0, path: '/', httpOnly: true });
  return res;
}
