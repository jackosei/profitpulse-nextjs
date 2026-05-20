/**
 * Email Notification Service — powered by Resend
 *
 * Tier 1 (Trader WHY Reminder): Triggered when discipline zone degrades to YELLOW or RED.
 * Tier 2 (Partner Alert):       Triggered on daily drawdown breach or terminal lockout.
 *
 * SETUP:
 *   1. Create a Resend account at https://resend.com
 *   2. Add RESEND_API_KEY to your .env.local
 *   3. Set RESEND_FROM_EMAIL to a verified sender address (e.g. alerts@yourdomain.com)
 *
 * This service is server-side only — never import in client components.
 */

import { Resend } from "resend";
import type { DisciplineZone } from "@/lib/disciplineTypes";

// ---------------------------------------------------------------------------
// Client singleton
// ---------------------------------------------------------------------------

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[emailService] RESEND_API_KEY not set — emails will not be sent");
    return null;
  }
  return new Resend(apiKey);
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "ProfitPulse <noreply@profitpulse.app>";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WHYReminderPayload {
  traderEmail: string;
  traderName: string;
  pulseName: string;
  whyStatement: string;
  whyDiscipline: string;
  disciplineZone: DisciplineZone;
  disciplineScore: number;
}

export interface PartnerAlertPayload {
  partnerEmail: string;
  traderName: string;
  pulseName: string;
  breachType: "DAILY_DRAWDOWN" | "TOTAL_DRAWDOWN_LOCKED";
  disciplineScore: number;
  details: string;
}

// ---------------------------------------------------------------------------
// Tier 1 — WHY Reminder (sent to trader when zone degrades)
// ---------------------------------------------------------------------------

export async function sendWHYReminder(payload: WHYReminderPayload): Promise<void> {
  const resend = getResendClient();
  if (!resend) return;

  const zoneLabel = payload.disciplineZone === "RED" ? "Enforcement 🔴" : "At Risk 🟡";

  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: auto; color: #1a1a2e;">
      <h2 style="color: #0f3460;">Remember Why You Started</h2>
      <p>Hi ${payload.traderName},</p>
      <p>Your discipline score on <strong>${payload.pulseName}</strong> has moved into the 
        <strong>${zoneLabel}</strong> zone (Score: ${payload.disciplineScore}/100).</p>
      
      <div style="background: #f5f5f5; border-left: 4px solid #e94560; padding: 16px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0 0 8px; font-size: 12px; text-transform: uppercase; color: #666;">Why I trade</p>
        <p style="margin: 0; font-style: italic;">"${payload.whyStatement}"</p>
      </div>
      
      <div style="background: #f5f5f5; border-left: 4px solid #0f3460; padding: 16px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0 0 8px; font-size: 12px; text-transform: uppercase; color: #666;">What following my rules means</p>
        <p style="margin: 0; font-style: italic;">"${payload.whyDiscipline}"</p>
      </div>
      
      <p>Log a clean session today — all required rules followed, full reflection — to begin recovery (+8 pts).</p>
      <p style="color: #888; font-size: 12px;">This is an automated reminder from ProfitPulse.</p>
    </div>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: payload.traderEmail,
      subject: `⚠️ ProfitPulse — Your discipline is ${zoneLabel} on ${payload.pulseName}`,
      html,
    });
  } catch (err) {
    console.error("[emailService] Failed to send WHY reminder:", err);
  }
}

// ---------------------------------------------------------------------------
// Tier 2 — Partner Alert (sent to accountability partner on serious breach)
// ---------------------------------------------------------------------------

export async function sendPartnerAlert(payload: PartnerAlertPayload): Promise<void> {
  const resend = getResendClient();
  if (!resend) return;

  const isLockout = payload.breachType === "TOTAL_DRAWDOWN_LOCKED";
  const subject = isLockout
    ? `🔒 ProfitPulse — ${payload.traderName} has been locked out of ${payload.pulseName}`
    : `⚠️ ProfitPulse — ${payload.traderName} hit a daily drawdown limit`;

  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: auto; color: #1a1a2e;">
      <h2 style="color: ${isLockout ? "#e94560" : "#e67e22"};">
        ${isLockout ? "🔒 Pulse Locked" : "⚠️ Daily Drawdown Limit Hit"}
      </h2>
      <p>Hi,</p>
      <p>Your accountability partner <strong>${payload.traderName}</strong> needs your support.</p>
      
      <div style="background: #fff8f0; border: 1px solid #ffd7a8; padding: 16px; border-radius: 4px; margin: 16px 0;">
        <p><strong>Pulse:</strong> ${payload.pulseName}</p>
        <p><strong>Event:</strong> ${payload.details}</p>
        <p><strong>Discipline Score:</strong> ${payload.disciplineScore}/100</p>
      </div>
      
      <p>Reach out and remind them of their commitment. A few words of encouragement can make all the difference.</p>
      <p style="color: #888; font-size: 12px;">This is an automated notification from ProfitPulse. You are receiving this because you are an accountability partner.</p>
    </div>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: payload.partnerEmail,
      subject,
      html,
    });
  } catch (err) {
    console.error("[emailService] Failed to send partner alert:", err);
  }
}
