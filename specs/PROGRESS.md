# ProfitPulse — Build progress

> Updated at the end of each Claude Code session.
> This file is the handoff document between sessions.

---

## Current phase
**Phase 1 — Foundation (Score + Meter)**

## Phase 1 checklist

### Trade data model
- [ ] Add `plannedSL` and `plannedTP` fields to trade form
- [x] Add `entryTime` and `exitTime` fields (already existed in TradeExecution)
- [ ] Compute and store `intendedRiskPct` at submission
- [ ] Compute and store `intendedRR` at submission
- [ ] Compute and store `actualR` at submission
- [ ] Compute and store `exitQuality` signal at submission
- [ ] Store `violations[]` array on trade document

### Pulse document — discipline fields
- [ ] Add `disciplineScore` (default: 100)
- [ ] Add `disciplineState` (default: 'NORMAL')
- [ ] Add `activeConstraints` object
- [ ] Add `lastSessionDate`
- [ ] Add `reflectionGatePending` (default: false)
- [ ] Add `weeklyBreachCounts` object
- [ ] Add `whyStatement` and `whyDiscipline` to pulse creation
- [ ] Add `accountabilityPartnerEmail` (default: null)

### Violation log subcollection
- [ ] Create `violationLog` subcollection schema
- [ ] Write violation event on each detected breach
- [ ] Composite index on `[pulseId, timestamp]`

### Discipline engine (`/lib/disciplineEngine.ts`)
- [x] Violation detection: risk per trade
- [x] Violation detection: daily drawdown
- [x] Violation detection: total drawdown
- [x] Violation detection: max trades per day
- [x] Violation detection: required rules (qualitative)
- [x] Score penalty application per violation type
- [x] Zone determination from score
- [x] Lazy recovery computation (on-read, from `lastSessionDate`)
- [ ] Weekly breach count tracking (Mon–Fri rolling window) — deferred, needs Pulse discipline fields

### Rule checklist upgrade
- [ ] Add `isRequired: boolean` to each rule in pulse creation
- [ ] Score weight: required rule missed = −4 pts, optional = −1 pt
- [ ] Session Rule Score computed at end of session (required rules % adherence)
- [ ] Additional −5 if 2+ required rules missed in single session
- [ ] Display Session Rule Score separately from discipline score

### Pulse onboarding — WHY step
- [ ] Add WHY step to pulse creation flow (non-skippable)
- [ ] Field 1: `whyStatement` — "What is driving you to trade?"
- [ ] Field 2: `whyDiscipline` — "What does following your rules mean for you?"
- [ ] Minimum 30 characters per field
- [ ] Store on Pulse document

### Meter UI
- [ ] Discipline meter component (0–100, red/yellow/green gradient)
- [ ] Zone label: "Stable" / "At Risk" / "Enforcement"
- [ ] Display in PulseHeader alongside existing rule violation indicators
- [ ] Recovery path hint: "What do I need to do to get back to Normal?"
- [ ] Session Rule Score badge (daily execution grade, separate from meter)

---

## Phase 2 checklist (not started)
- [ ] Move violation evaluation to `/app/api/discipline/evaluate/route.ts`
- [ ] Discipline state machine (NORMAL → LIMITED → RESTRICTED → RECOVERY)
- [ ] Session gate: acknowledgement screen on constraint active days
- [ ] Risk cap: inline warning + submission check
- [ ] Trade count cap: banner countdown + submission block
- [ ] No-trade day: hard block + "Log violation trade" fallback
- [ ] Reflection gate UI (50-char minimum, gates journal access)
- [ ] Zone amplification logic (Yellow/Red escalation modifier)
- [ ] Cap lifting logic (compliant capped session → cap removed + +5 recovery)

## Phase 3 checklist (not started)
- [ ] Tier 1 WHY reminder notifications (in-app + email)
- [ ] Tier 2 partner notifications (email)
- [ ] Accountability partner setup in Pulse settings
- [ ] Streak tracking (3-day consecutive bonus)
- [ ] Multi-session risk cap countdown (3-session, 5-session for total drawdown)
- [ ] Discipline score history chart (30-day rolling)
- [ ] SMS notifications (Twilio — optional)

---

## Session log

### Session 1 — 2026-04-24
**What was built:**
- Created `/src/lib/disciplineTypes.ts` — `ViolationType`, `ViolationCategory` enums, `TradeViolation`, `TradeEngineMetrics`, `EvaluationContext`, `TradeForEvaluation`, `SessionSummary`, `DisciplineZone` types
- Created `/src/lib/disciplineEngine.ts` — core engine with 4 exported pure functions:
  - `evaluateViolations(trade, ctx)` — detects all 5 violation types with risk escalation
  - `applyScorePenalties(currentScore, violations)` — sums severities, clamps 0–100
  - `getZone(score)` — GREEN/YELLOW/RED lookup
  - `computeRecovery(score, session, gatePending)` — session recovery with daily caps per zone
- Added `plannedSL?: number` and `plannedTP?: number` to `TradeExecution` in `/src/types/pulse.ts`
- Added `engineMetrics?: TradeEngineMetrics` to the `Trade` interface
- Confirmed `entryTime`/`exitTime` already existed — marked done

**Decisions made that deviate from spec:**
- Engine-derived fields nested under `engineMetrics` on Trade (consistent with app's nested pattern)
- `intendedRR` and `exitQuality` typed `number | null` — require `plannedTP` to compute
- Daily/total drawdown violations fire once per breach (on the causing trade only, not on subsequent trades in the same session)
- `maxTradesPerDay` not yet on Pulse document — engine accepts it via `EvaluationContext` parameter
- Weekly breach count tracking deferred until Pulse discipline fields are added

**Blockers / questions for next session:**
- `node_modules` not installed — could not run `tsc --noEmit` to verify compilation
- Weekly breach count tracking depends on Pulse document discipline fields (next checklist section)

**Next session should start with:**
- Add `plannedSL` and `plannedTP` fields to the trade form UI
- Wire up engine metric computation at trade submission time
- Or: add Pulse document discipline fields to unblock weekly breach counts

---
<!-- Claude Code: append new sessions above this line, newest first -->
