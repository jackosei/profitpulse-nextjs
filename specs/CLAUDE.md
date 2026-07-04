# ProfitPulse — Claude Code context

## What this app is
A trade journaling and performance tool for serious day traders (Forex, Futures, Crypto).
The core differentiator is the **Discipline Engine** — a closed-loop behavioural system that
scores rule violations and applies adaptive forward constraints. Unlike all competing tools
(Edgewonk, TradeZella, TraderSync), ProfitPulse governs what happens *next*, not just what happened.

Full spec: `/docs/discipline-engine-spec-v1.docx`

---

## Stack
- **Framework:** Next.js (App Router), TypeScript
- **Database:** Firebase Firestore
- **Auth:** Firebase Auth
- **Styling:** Tailwind CSS

---

## Current build phase
**Phase 2 — Enforcement (State machine + Constraints)**
Phase 1 (observational scoring) is complete and released as v3.0.0.
Phase 2 moves all evaluation logic server-side and adds enforcement constraints
(caps, lockouts, session gates). The client reads state but never computes it.

---

## Key domain concepts

### Session
A session = a calendar day, identified by a date string (`YYYY-MM-DD`).
There is no explicit session open/close by the user. All trades on the same date belong to the same session.

### Discipline score
- Range: 0–100. Starts at 100 on Pulse creation.
- Zones: Green (75–100), Yellow (40–74), Red (0–39)
- Decreases on violations. Recovers with compliant sessions.
- Zone amplifies enforcement — same breach hits harder in Yellow/Red than Green.

### Pulse
The primary container document. Each Pulse holds:
- The trader's configured risk parameters
- Their trading rule checklist (Required / Optional)
- Their WHY statement (from onboarding)
- The discipline engine state

### Trade data model (v2 — expanded)
**Trade Setup:** date, instrument, type, lot size, entry price, entry time, plannedSL, plannedTP
**Trade Result:** exit price, exit time, pnlAmount
**Engine-derived (computed at submission, stored):** intendedRiskPct, intendedRR, actualR, exitQuality, violations[]

### Violation types
- **Quantitative** (auto-detected): risk per trade %, daily drawdown %, total drawdown %, max trades per day
- **Qualitative** (rule checklist): required rules unchecked at submission

---

## Architecture rules

### Discipline engine location
- **Phase 1:** evaluation logic may live in `/lib/disciplineEngine.ts` (client-accessible)
- **Phase 2 (before any enforcement ships):** must move to `/app/api/discipline/evaluate/route.ts`
  Server-side only. Never in components. This boundary is non-negotiable to prevent gaming.

### File structure conventions
```
/lib/disciplineEngine.ts        # Core scoring + violation detection logic
/lib/disciplineTypes.ts         # All TS types and enums for the engine
/app/api/discipline/            # Phase 2+ API routes (server-side enforcement)
/components/pulse/              # Pulse-level UI components
/components/discipline/         # Meter, session gate, reflection gate components
```

### Firestore collections
```
pulses/{pulseId}                          # Pulse document (includes discipline state)
pulses/{pulseId}/trades/{tradeId}         # Trade documents
pulses/{pulseId}/violationLog/{id}        # Violation events (subcollection)
```

---

## Discipline engine — Firestore fields on Pulse document
```typescript
disciplineScore: number                   // 0–100
disciplineState: 'NORMAL' | 'LIMITED' | 'RESTRICTED' | 'RECOVERY'
activeConstraints: {
  riskCapPct: number | null,              // e.g. 0.5 = 50% of configured limit
  tradeCapCount: number | null,
  lockoutUntil: Timestamp | null,
  noTradeDays: number                     // remaining no-trade days
}
violationLog: subcollection               // see above
lastSessionDate: string                   // YYYY-MM-DD
reflectionGatePending: boolean
weeklyBreachCounts: {
  riskPerTrade: number,
  drawdownDaily: number,
  drawdownTotal: number,                  // lifetime count, no weekly reset
  overtrading: number
}
whyStatement: string                      // from onboarding, used in notifications
whyDiscipline: string                     // from onboarding, used in notifications
accountabilityPartnerEmail: string | null
```

---

## Enforcement matrix — quick reference

### Tier ladder (mode-independent)
Tier outcomes are the same regardless of which signal drives the ladder.

| Tier | Outcome | Clean sessions to lift |
|---|---|---|
| 1 | nothing (WHY prompt on first weekly risk breach) | — |
| 2 | 75% per-trade risk cap | 2 |
| 3 | 50% cap + NTD warning | 3 |
| 4 | NTD + 50% cap (extends NTD by 1 if already active) | 3 |
| 5 | Extended NTD pathway | 3 |

### Tier triggering — per-pulse choice
Each pulse picks one mode at creation. Default: `SCORE_BASED`.

**Score-based** (`SCORE_BASED`)
| Discipline score | Tier |
|---|---|
| ≥ 85 | 1 |
| 70–84 | 2 |
| 55–69 | 3 |
| 40–54 | 4 |
| < 40 | 5 |

**Severity-based** (`SEVERITY_BASED`) — weekly cumulative severity
| Weekly severity | Tier |
|---|---|
| 0–4 | 1 |
| 5–14 | 2 |
| 15–24 | 3 |
| 25–39 | 4 |
| 40+ | 5 |

### Per-violation severity (contributes to score AND severity total)
| Violation | Severity | Notes |
|---|---|---|
| Risk per trade | 5 | First weekly breach also fires WHY reminder |
| Daily drawdown | 15 | Also sets `reflectionGatePending`, +3 clean sessions |
| Total drawdown | 25 | Permanent lockout |
| Max trades/day | 8 | First weekly with no existing cap → trade cap (limit−1) |
| Required rule missed | 4 / rule | — |
| Optional rule missed | 1 / rule | — |
| Multi-required-rule miss | 5 | When ≥2 required rules missed in a session |
| No-trade day violated | 20 | Acknowledgement-only — score deduction |

Severity is amplified in YELLOW/RED zones via `amplifyPenalty` — the amplified value is what gets added to `weeklySeverityTotal` and subtracted from the score, so amplification feeds back into the tier ladder.

---

## Recovery logic — quick reference
- Clean session (no violations, ≥1 trade): +8 pts
- Full journal completed (reflection >50 chars): +3 bonus
- 100% required rules followed: +2 bonus
- Reflection gate completed after lockout: +5 (one-time)
- 3 consecutive clean days: +10 streak bonus
- Daily cap: +13 (Green), +10 (Yellow), +5 (Red)

---

## Constraints and guards
- Score cannot increase while `reflectionGatePending = true`
- Minimum 1 logged trade for any daily recovery credit
- Reflection responses must exceed 50 characters
- Streak requires ≥1 trade each day (no-trade days don't count toward or against)

---

## Enforcement model — friction ladder

This app is a **post-execution** logging tool. Trades are executed externally (MT4, broker, TradingView) and logged here afterward. Enforcement therefore operates on the logging layer, not the execution layer.

| Tier | Trigger | Server response | UX behaviour |
|------|---------|-----------------|--------------|
| 0 — Informational | No caps, GREEN zone | 200 OK | Trade logs normally. Violation toast on breach. |
| 1 — Soft friction | 1st risk breach, rule misses | 200 OK | WHY reminder email fires. Prominent toast. |
| 2 — Acknowledged friction | Risk cap or trade cap active | 422 unless `capAck: true` in body | Amber "Submit with Acknowledged Cap" button in form. |
| 3 — Hard friction | No-trade day active | 409 unless `noTradeDayAck: true` in body | Typed "I acknowledge" overlay before form submits. |
| 4 — Hard block | `reflectionGatePending` or total drawdown lock | 403 (existing) | No bypass path. |

**Session gate** (once per day): If any constraint is active and `discipline.sessionGateAckDate !== calendarToday`, evaluate returns 403 `SESSION_GATE_NOT_ACKNOWLEDGED`. The trader must click "I acknowledge" in the SessionGate UI (which calls `POST /api/discipline/acknowledge-session`) before the form will submit.

All Tier 2–3 trades still write to Firestore with appropriate violation flags — the friction is an acknowledgement requirement, not a hard block on data capture.

**Warn-then-lock (tier 4):** When the trader first crosses into tier 4 territory the engine sets `activeConstraints.ntdWarningPending = true` and applies only the 50% cap (no NTD). The *next* tier-4 condition fires the actual NTD. If breached while NTD is already active, the NTD extends by 1 day. The warning clears when the cap is lifted (via `shouldLiftConstraints` once `cleanSessionsToLift` reaches 0).

**Accountability partner alerts (Tier 2 — Resend email + Twilio SMS stub).** One alert per trade, picked by priority so the partner gets the most salient signal:

| Priority | Trigger | `breachType` |
|---|---|---|
| 1 | `isLockedPermanently` (`TOTAL_DRAWDOWN`) | `TOTAL_DRAWDOWN_LOCKED` |
| 2 | NTD freshly applied (`noTradeDays`: 0 → >0) | `NO_TRADE_DAY` |
| 3 | `DAILY_DRAWDOWN` violation on this trade | `DAILY_DRAWDOWN` |
| 4 | NTD warning freshly set (`ntdWarningPending`: false → true) | `NTD_WARNING` |

All gated by `discipline.accountabilityPartnerEmail` being set on the pulse.

## What NOT to do
- Do not put enforcement logic in React components or client hooks
- Do not permanently block logging for cap violations — use 422 + `capAck` re-submit instead
- Do not permanently block logging on no-trade days — use 409 + `noTradeDayAck` re-submit instead
- Do not compute recovery from empty sessions (user opened app but logged no trades)
- Do not reset `weeklyBreachCounts.drawdownTotal` — it is a lifetime counter

---

## Open questions / deferred
- SMS provider (Twilio) — deferred to Phase 3
- Break-even stop moves — explicitly out of scope, not tracked
- Partial exits — handled via weighted average exit price, no parent/child trade structure needed
- Penalty weight calibration — review after 30 days of Phase 1 real usage data
