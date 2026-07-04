import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/services/admin'

export const runtime = 'nodejs'

const WHY_MIN_CHARS = 30

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

export async function PATCH(request: NextRequest) {
  const uid = await verifyAuth(request)
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let pulseId: unknown, whyStatement: unknown, whyDiscipline: unknown
  try {
    ;({ pulseId, whyStatement, whyDiscipline } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (typeof pulseId !== 'string' || !pulseId.trim())
    return NextResponse.json({ error: 'pulseId is required' }, { status: 400 })

  if (typeof whyStatement !== 'string' || whyStatement.trim().length < WHY_MIN_CHARS)
    return NextResponse.json(
      { error: `Why I trade must be at least ${WHY_MIN_CHARS} characters` },
      { status: 400 },
    )

  if (typeof whyDiscipline !== 'string' || whyDiscipline.trim().length < WHY_MIN_CHARS)
    return NextResponse.json(
      { error: `Why I follow my rules must be at least ${WHY_MIN_CHARS} characters` },
      { status: 400 },
    )

  // Verify ownership
  const snap = await adminDb
    .collection('pulses')
    .where('id', '==', pulseId)
    .where('userId', '==', uid)
    .limit(1)
    .get()

  if (snap.empty) return NextResponse.json({ error: 'Pulse not found' }, { status: 404 })

  await adminDb
    .collection('pulses')
    .doc(snap.docs[0].id)
    .update({
      'discipline.whyStatement': whyStatement.trim(),
      'discipline.whyDiscipline': whyDiscipline.trim(),
    })

  return NextResponse.json({ success: true })
}
