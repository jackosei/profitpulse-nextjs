/**
 * SMS Notification Service — SMS-Ready Stub (Twilio)
 *
 * This file is structured and ready for Twilio integration.
 * All the interfaces, logic flow, and message templates are in place.
 * Activation requires adding Twilio credentials (no code changes needed).
 *
 * ACTIVATION:
 *   1. Sign up at https://twilio.com and purchase a phone number
 *   2. Add to your .env.local:
 *        TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *        TWILIO_AUTH_TOKEN=your_auth_token
 *        TWILIO_FROM_NUMBER=+1xxxxxxxxxx
 *   3. Install the SDK: npm install twilio
 *   4. Uncomment the twilio import lines below and remove the mock log block
 *
 * This service is server-side only — never import in client components.
 */

// ---------------------------------------------------------------------------
// Twilio client (uncomment when credentials are available)
// ---------------------------------------------------------------------------

// import twilio from "twilio";
//
// function getTwilioClient() {
//   const accountSid = process.env.TWILIO_ACCOUNT_SID;
//   const authToken  = process.env.TWILIO_AUTH_TOKEN;
//   if (!accountSid || !authToken) {
//     console.warn("[smsService] TWILIO credentials not set — SMS will not be sent");
//     return null;
//   }
//   return twilio(accountSid, authToken);
// }

const FROM_NUMBER = process.env.TWILIO_FROM_NUMBER ?? "+10000000000";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SMSPayload {
  /** Recipient's E.164-formatted phone number, e.g. "+447911123456" */
  to: string;
  /** The text message body (keep under 160 chars for single segment) */
  body: string;
}

// ---------------------------------------------------------------------------
// Core send function
// ---------------------------------------------------------------------------

/**
 * Sends an SMS to the given number.
 * Currently logs to stdout as a mock (SMS-ready, activation requires Twilio creds).
 */
export async function sendSMS(payload: SMSPayload): Promise<void> {
  const { to, body } = payload;

  // ── Mock mode (active until TWILIO_ env vars are set) ───────────────────
  if (
    !process.env.TWILIO_ACCOUNT_SID ||
    !process.env.TWILIO_AUTH_TOKEN
  ) {
    console.info(
      `[smsService] [MOCK] SMS would be sent:
  To:   ${to}
  From: ${FROM_NUMBER}
  Body: ${body}`
    );
    return;
  }

  // ── Live mode (uncomment when activating Twilio) ─────────────────────────
  // const client = getTwilioClient();
  // if (!client) return;
  // try {
  //   await client.messages.create({ from: FROM_NUMBER, to, body });
  // } catch (err) {
  //   console.error("[smsService] Failed to send SMS:", err);
  // }
}

// ---------------------------------------------------------------------------
// Pre-built message templates
// ---------------------------------------------------------------------------

/** Tier 1: WHY reminder SMS to the trader when zone degrades */
export async function sendWHYReminderSMS(opts: {
  to: string;
  traderName: string;
  pulseName: string;
  zone: "YELLOW" | "RED";
  score: number;
}): Promise<void> {
  const zoneLabel = opts.zone === "RED" ? "Enforcement" : "At Risk";
  await sendSMS({
    to: opts.to,
    body: `ProfitPulse — ${opts.traderName}, your discipline is now ${zoneLabel} (${opts.score}/100) on "${opts.pulseName}". Remember why you started. Log a clean session today.`,
  });
}

/** Tier 2: Partner alert SMS on drawdown breach or lockout */
export async function sendPartnerAlertSMS(opts: {
  to: string;
  traderName: string;
  pulseName: string;
  breachType: "DAILY_DRAWDOWN" | "TOTAL_DRAWDOWN_LOCKED";
}): Promise<void> {
  const msg =
    opts.breachType === "TOTAL_DRAWDOWN_LOCKED"
      ? `${opts.traderName} has been locked out of "${opts.pulseName}" on ProfitPulse after hitting their total drawdown limit. They need your support.`
      : `${opts.traderName} hit their daily drawdown limit on "${opts.pulseName}" on ProfitPulse. Reach out and encourage them.`;

  await sendSMS({ to: opts.to, body: `ProfitPulse — ${msg}` });
}
