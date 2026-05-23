import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/services/admin'
import * as admin from 'firebase-admin'
import { Resend } from 'resend'

export const runtime = 'nodejs'

const RATE_LIMIT_HOURS = 24
const TO_EMAIL = process.env.CONTACT_TO_EMAIL ?? 'hello@profitpulse.app'
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'ProfitPulse <noreply@profitpulse.app>'

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

function contactMetaDoc(uid: string) {
  return adminDb.collection('users').doc(uid).collection('meta').doc('contact')
}

export async function POST(request: NextRequest) {
  const uid = await verifyAuth(request)
  if (!uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let subject: unknown, message: unknown, senderEmail: unknown, senderName: unknown
  try {
    ;({ subject, message, senderEmail, senderName } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (typeof subject !== 'string' || !subject.trim()) {
    return NextResponse.json({ error: 'Subject is required' }, { status: 400 })
  }
  if (typeof message !== 'string' || message.trim().length < 20) {
    return NextResponse.json({ error: 'Message must be at least 20 characters' }, { status: 400 })
  }

  // Rate limit: one message per 24h per user
  const metaDoc = contactMetaDoc(uid)
  const metaSnap = await metaDoc.get()
  if (metaSnap.exists) {
    const lastContactAt = metaSnap.data()?.lastContactAt as admin.firestore.Timestamp | undefined
    if (lastContactAt) {
      const hoursSinceLast = (Date.now() - lastContactAt.toMillis()) / (1000 * 60 * 60)
      if (hoursSinceLast < RATE_LIMIT_HOURS) {
        const hoursLeft = Math.ceil(RATE_LIMIT_HOURS - hoursSinceLast)
        return NextResponse.json(
          { error: `You can send one message every 24 hours. Try again in ${hoursLeft}h.` },
          { status: 429 },
        )
      }
    }
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('[contact] RESEND_API_KEY not configured')
    return NextResponse.json({ error: 'Email service unavailable' }, { status: 503 })
  }

  const resend = new Resend(apiKey)
  const name = typeof senderName === 'string' && senderName.trim() ? senderName.trim() : 'A user'
  const email = typeof senderEmail === 'string' ? senderEmail.trim() : ''

  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: auto; color: #1a1a2e;">
      <h2 style="color: #0f3460; margin-bottom: 4px;">New message via ProfitPulse</h2>
      <p style="color: #888; margin-top: 0; font-size: 13px;">Sent from the in-app contact form</p>

      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
        <tr>
          <td style="padding: 8px 12px; background: #f5f5f5; font-weight: 600; width: 120px;">From</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${name} &lt;${email}&gt;</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; background: #f5f5f5; font-weight: 600;">Subject</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${subject}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; background: #f5f5f5; font-weight: 600;">User ID</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-family: monospace; font-size: 12px;">${uid}</td>
        </tr>
      </table>

      <div style="background: #f9f9f9; border-left: 4px solid #0f3460; padding: 16px; border-radius: 4px; white-space: pre-wrap; font-size: 15px; line-height: 1.6;">
${message.trim()}
      </div>

      <p style="color: #aaa; font-size: 11px; margin-top: 24px;">
        Reply directly to this email to respond to ${name}.
      </p>
    </div>
  `

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: TO_EMAIL,
      replyTo: email || undefined,
      subject: `[ProfitPulse Contact] ${subject}`,
      html,
    })
  } catch (err) {
    console.error('[contact] Resend error:', err)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }

  // Record submission time
  await metaDoc.set(
    { lastContactAt: admin.firestore.Timestamp.now() },
    { merge: true },
  )

  return NextResponse.json({ success: true })
}
