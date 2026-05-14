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
Full ladders in spec doc. Summary:

| Violation | Score hit | First consequence | Repeat (same week) |
|---|---|---|---|
| Risk per trade (breach 1) | −5 | WHY prompt only | → escalate |
| Risk per trade (breach 2, same day) | −10 | 75% risk cap next day | → 50% cap |
| Risk per trade (breach 3+) | −15 | 50% cap + soft lockout | → no-trade day |
| Daily drawdown hit | −15 | Day locked + reflection gate | → no-trade day |
| Total drawdown hit (1st ever) | −25 | Full lockout + 50% cap × 3 sessions | → 2-day lockout |
| Max trades/day hit | −8 | Day locked + (limit−1) cap next day | → no-trade day |
| Required rule missed | −4/rule | Score drain only, no lockout | Accumulates toward zone change |

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

## What NOT to do
- Do not put enforcement logic in React components or client hooks
- Do not block journal entries for cap violations (trade already happened at broker) — detect and escalate instead
- Do not block journal entries entirely on no-trade days — provide "Log violation trade" fallback path
- Do not compute recovery from empty sessions (user opened app but logged no trades)
- Do not reset `weeklyBreachCounts.drawdownTotal` — it is a lifetime counter

---

## Open questions / deferred
- SMS provider (Twilio) — deferred to Phase 3
- Break-even stop moves — explicitly out of scope, not tracked
- Partial exits — handled via weighted average exit price, no parent/child trade structure needed
- Penalty weight calibration — review after 30 days of Phase 1 real usage data
