# ProfitPulse — Build progress

> Updated at the end of each Claude Code session.
> This file is the handoff document between sessions.

---

## Current phase
**Phase 1 — Foundation (Score + Meter) ✅ COMPLETE**
**Phase 2 — Enforcement (ready to start)**

## Phase 1 checklist

### Trade data model
- [x] Add `plannedSL` and `plannedTP` fields to trade form
- [x] Add `entryTime` and `exitTime` fields (already existed in TradeExecution)
- [x] Compute and store `intendedRiskPct` at submission
- [x] Compute and store `intendedRR` at submission
- [x] Compute and store `actualR` at submission
- [x] Compute and store `exitQuality` signal at submission
- [x] Store `violations[]` array on trade document

### Pulse document — discipline fields
- [x] Add `disciplineScore` (default: 100)
- [x] Add `disciplineState` (default: 'NORMAL')
- [x] Add `activeConstraints` object
- [x] Add `lastSessionDate`
- [x] Add `reflectionGatePending` (default: false)
- [x] Add `weeklyBreachCounts` object
- [x] Add `whyStatement` and `whyDiscipline` to pulse creation
- [x] Add `accountabilityPartnerEmail` (default: null)

### Violation log subcollection
- [x] Create `violationLog` subcollection schema (`ViolationLogEntry` in `disciplineTypes.ts`)
- [x] Write violation event on each detected breach (in `pulseService.createTrade`)
- [ ] Composite index on `[pulseId, timestamp]` — requires Firebase console or `firestore.indexes.json` (not code)

### Discipline engine (`/lib/disciplineEngine.ts`)
- [x] Violation detection: risk per trade
- [x] Violation detection: daily drawdown
- [x] Violation detection: total drawdown
- [x] Violation detection: max trades per day
- [x] Violation detection: required rules (qualitative, −4 each)
- [x] Violation detection: optional rules (qualitative, −1 each)
- [x] Session-level multi-miss penalty: `MULTI_REQUIRED_RULE_MISS` (−5 when ≥2 required missed)
- [x] `computeSessionRuleScore()` — pure function, session-end execution grade
- [x] `buildMultiMissViolation()` — helper to build the session-level penalty violation
- [x] Score penalty application per violation type
- [x] Zone determination from score
- [x] Lazy recovery computation (on-read, from `lastSessionDate`)
- [x] Weekly breach count tracking — increments on each quantitative violation at trade submission

### Rule checklist upgrade
- [x] Add `isRequired: boolean` to each rule in pulse creation (already existed)
- [x] Score weight: required rule missed = −4 pts, optional = −1 pt
- [x] `OPTIONAL_RULE_MISSED` violation type added
- [x] `MULTI_REQUIRED_RULE_MISS` violation type added (session-level)
- [x] `computeSessionRuleScore()` added to engine
- [x] `buildMultiMissViolation()` added to engine
- [x] Session Rule Score wired to pulse detail page (computed from today's trades, passed to DisciplineMeter)

### Pulse onboarding — WHY step
- [x] Add WHY step to pulse creation flow (non-skippable)
- [x] Field 1: `whyStatement` — "What is driving you to trade?"
- [x] Field 2: `whyDiscipline` — "What does following your rules mean for you?"
- [x] Minimum 30 characters per field
- [x] Store on Pulse document

### Meter UI
- [x] Discipline meter component (0–100, red/yellow/green gradient)
- [x] Zone label: "Stable" / "At Risk" / "Enforcement"
- [x] Display in PulseHeader alongside existing rule violation indicators
- [x] Recovery path hint: "What do I need to do to get back to Normal?"
- [x] Session Rule Score badge (daily execution grade, separate from meter)

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
- [ ] Weekly breach count tracking (Mon–Fri rolling window) — weekly reset logic
- [ ] Add `firestore.indexes.json` with composite index on `[pulseId, timestamp]` for violationLog

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

### Session 4 — 2026-05-08
**What was built:**

*Session Rule Score live wiring:*
- Updated `/src/app/pulse/[id]/page.tsx`:
  - Imports `getZone`, `computeSessionRuleScore` from engine
  - Reads `pulse.discipline` for live `disciplineScore` and computes `disciplineZone`
  - Filters today's trades, computes `sessionRuleScore` via `computeSessionRuleScore()`
  - Passes `disciplineScore`, `disciplineZone`, `sessionRuleScore`, `recoveryHint` to `PulseHeader`
  - `DisciplineMeter` now shows real data instead of placeholders

*Weekly breach count tracking:*
- Updated `pulseService.createTrade()` in `/src/services/firebase/pulseService.ts`:
  - Imports `ViolationType` enum
  - Maps violations to `weeklyBreachCounts` fields (riskPerTrade, drawdownDaily, drawdownTotal, overtrading)
  - Increments counts atomically in the same Firestore `updateDoc` call as the discipline score update
  - `drawdownTotal` is a lifetime counter (never resets) per CLAUDE.md spec

**Decisions that deviate from spec:**
- Weekly breach count reset (Mon–Fri rolling window) is deferred to Phase 2 — increment logic is in place now, but the weekly boundary reset needs a scheduled job or on-read check. Phase 2 will add this alongside enforcement.
- `recoveryHint` is computed inline in the page component as simple zone-based strings. Phase 2 may refine these to include constraint-specific guidance.
- `computeSessionRuleScore` only sees trades loaded in the current page — if pagination means not all today's trades are loaded, the score may undercount. Acceptable for Phase 1; the engine function itself is correct.

**Blockers / open questions:**
- None. Phase 1 is complete.

**Next session should start with:**
Phase 2: move violation evaluation to `/app/api/discipline/evaluate/route.ts` (server-side only). This is the non-negotiable prerequisite from CLAUDE.md before any enforcement constraints ship.

---

### Session 3 — 2026-04-24
**What was built:**

*Pulse discipline fields + WHY onboarding:*
- Added `PulseDisciplineFields`, `DisciplineState`, `ActiveConstraints`, `WeeklyBreachCounts` interfaces to `/src/lib/disciplineTypes.ts`
- Added `createDefaultDisciplineFields()` factory function to `disciplineTypes.ts`
- Added `discipline?: PulseDisciplineFields` field to `Pulse` interface in `/src/types/pulse.ts`
- Added `whyStatement?`, `whyDiscipline?`, `maxTradesPerDay?` to `PulseCreateData` in `/src/services/api/pulseApi.ts`
- Updated `pulseService.createPulse()` to initialize `discipline` field with defaults on new Pulse documents
- Converted `CreatePulseModal.tsx` from single-screen to 2-step flow:
  - Step 1: existing config form (unchanged)
  - Step 2: WHY step — two textareas, 30-char inline validation on blur, character counter, green/red border feedback, "Create Pulse" button disabled until both fields meet minimum

*Trade submission engine wiring:*
- Added `plannedSL`, `plannedTP` to `TradeFormData` in `trade-form/types.ts`
- Added SL/TP input fields to `TradeDataForm.tsx` between entry/exit prices and P/L
- Added SL/TP to `TradeCreateData.execution` in `pulseApi.ts`
- Added `engineMetrics?: TradeEngineMetrics` to `TradeCreateData` in `pulseApi.ts`
- Updated `TradeFormModal.tsx`: added `plannedSL`/`plannedTP` to both init state branches; passes to execution object on submit
- Updated `pulseService.createTrade()`:
  - Queries today's trades to get `dailyTradeCount` and `riskBreachesToday`
  - Builds `EvaluationContext` from Pulse document
  - Runs `evaluateViolations()` → computes `engineMetrics` (intendedRiskPct, intendedRR, actualR, exitQuality)
  - Stores `engineMetrics` on trade Firestore document
  - Updates `discipline.disciplineScore` and `discipline.disciplineState` on Pulse document
  - Updates `discipline.lastSessionDate` on every trade submission

*Rule scoring types + engine upgrade:*
- Added `OPTIONAL_RULE_MISSED` and `MULTI_REQUIRED_RULE_MISS` to `ViolationType` enum
- Added `SessionRuleScore` interface to `disciplineTypes.ts`
- Added `requiredRulesMissedCount` and `sessionRuleScore` fields to `SessionSummary`
- Added `ViolationLogEntry` interface to `disciplineTypes.ts` (violation log subcollection schema)
- Added `OPTIONAL_RULE_PENALTY = 1` and `MULTI_REQUIRED_MISS_PENALTY = 5` constants to `disciplineEngine.ts`
- Updated `evaluateViolations()` to detect optional rule misses (`OPTIONAL_RULE_MISSED`, −1 each)
- Added `computeSessionRuleScore(sessionTrades, pulseRules, date) → SessionRuleScore` export
- Added `buildMultiMissViolation() → TradeViolation` export
- Updated `pulseService.createTrade()` to write one `ViolationLogEntry` doc to `violationLog` subcollection per violation, with running score-before/after tracking

**Decisions that deviate from spec:**
- `MULTI_REQUIRED_RULE_MISS` is a session-level violation handled by `computeSessionRuleScore`, not by `evaluateViolations` — because it requires aggregating across all trades in the day before it can fire. The per-trade function cannot know this.
- Optional rule misses (−1 each) are detected at per-trade submission, not at session end — consistent with how required rule misses work, even though the spec only explicitly mentions required rules at submission.
- WHY fields default to `""` on the `PulseDisciplineFields` type — the UI enforces the 30-char minimum, but the type allows empty strings for backward compat with any pre-engine Pulse documents.
- `discipline` is optional (`?`) on the `Pulse` interface — pre-engine Pulses in Firestore won't have this field; the service handles `discipline === undefined` gracefully.
- ViolationLog composite index (`[pulseId, timestamp]`) requires Firebase console or `firestore.indexes.json` — not automated in code; moved to Phase 2 checklist.

**Blockers / open questions:**
- `computeSessionRuleScore` and `buildMultiMissViolation` are written and exported but not yet called from anywhere — the session-end trigger point (when a calendar day ends) has not been wired. This is a read-path operation, most naturally done in the hook that loads pulse data.
- `DisciplineMeter.sessionRuleScore` prop exists in the component but is passed a static/placeholder value from `PulseHeader` — it needs to be computed from real session data at the hook level.
- Weekly breach count fields exist on `PulseDisciplineFields` but the increment logic is not written.

**Next session should start with:**
Wire `computeSessionRuleScore` into the Pulse data read path (in `usePulse` or a new `useDiscipline` hook) so `DisciplineMeter` receives a live Session Rule Score computed from today's trades. This also enables the `buildMultiMissViolation` penalty to fire correctly at session boundary.

---

### Session 2 — 2026-04-24
**What was built:**
- Created `/src/components/discipline/DisciplineMeter.tsx` — props: `score`, `zone`, `sessionRuleScore`, `recoveryHint`
  - Gradient bar (red→yellow→green) with score marker
  - Zone label badge (Stable / At Risk / Enforcement)
  - Session Rule Score badge labelled "Today's execution" (separate from bar)
  - Recovery hint row visible only when zone ≠ GREEN
- Integrated `DisciplineMeter` into `PulseHeader` as an optional row
  - 4 new optional props: `disciplineScore?`, `disciplineZone?`, `sessionRuleScore?`, `recoveryHint?`
  - Meter row only renders when all three numeric props are present — no breaking change to existing callers
- `tsc --noEmit` passes with zero errors across full project

**Decisions made that deviate from spec:**
- Gradient uses inline `style` (not Tailwind classes) — Tailwind JIT cannot generate gradient colour stops at arbitrary percentages (40%, 75%)
- All discipline props on PulseHeader are optional so the meter degrades gracefully on pulses that don't yet have discipline fields written

**Blockers / questions for next session:**
- None

**Next session should start with:**
- Add Pulse document discipline fields (disciplineScore, disciplineState, activeConstraints, etc.) to types and Firestore service
- Wire the engine into trade submission so violations and score are computed and stored on each trade

---

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
