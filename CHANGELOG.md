# Changelog

## [4.12.0] - 2026-05-23

### New Features
- **Edit WHY statements**: traders can now update `whyStatement` and `whyDiscipline` at any time without going through the one-shot pulse update flow. Edit button appears in the Discipline tab's WHY section and on the WHY reminder banner (when zone is degraded). `PATCH /api/discipline/why` validates ownership and enforces the 30-char minimum server-side.

### Performance
- **Incremental stats update**: `recalculateStats` no longer fetches all trades on every submission. Stats are derived from the current pulse `stats` object plus the single new trade — zero extra Firestore reads per trade submission.

---

## [4.11.0] - 2026-05-23

### New Features
- **Sessions subcollection** (`pulses/{id}/sessions/{YYYY-MM-DD}`): one document per trading day, written/upserted at every trade submission. Stores `tradeCount`, `wins`, `losses`, `totalPnL`, `disciplineScoreAfter`, `zone`, `hasViolations`, `engagementScore`. Enables O(1) history queries instead of scanning violations.
- **Discipline history route** now reads from `sessions` instead of `violationLog` — two `violationLog` queries replaced by one `sessions` query per request.
- **`SessionSnapshot` type** added to `disciplineTypes.ts`.
- **Backfill script** at `scripts/backfill-sessions.ts`: populates session docs for all existing pulses from their trades and violation logs. Run with: `npx tsx --env-file=.env.local scripts/backfill-sessions.ts`

### Internal
- Firestore security rules updated: `sessions` subcollection is read-accessible to the pulse owner; write is server-side only (`allow write: if false`).

---

## [4.10.1] - 2026-05-23

### Internal
- **Firestore indexes**: added all missing composite indexes to `firestore.indexes.json`. Queries that would have thrown `FAILED_PRECONDITION` in production are now covered:
  - `pulses`: `(id, userId)` — used by pulse lookup across all discipline routes and pulseService
  - `pulses`: `(name, userId)` — used by duplicate name check on pulse creation
  - `pulses`: `(userId, status)` — used by `getUserPulses` when filtering by active/archived
  - `violationLog`: `(sessionDate ASC, timestamp ASC)` — discipline history range queries
  - `violationLog`: `(sessionDate DESC, timestamp DESC)` — pre-window baseline lookup
  - `violationLog`: `(sessionDate ASC, timestamp DESC)` — per-session violation listing
- **`.firebaserc`**: added default project alias so `firebase deploy` works without `--project` flag.

---

## [4.10.0] - 2026-05-23

### New Features
- **Account deletion now removes all data**: `DELETE /api/account` server route performs a full cascading delete before removing the Auth record — all pulses (+ `trades`, `violationLog` subcollections), the user document (+ `journal`, `meta` subcollections), then `adminAuth.deleteUser(uid)`. Previously `user.delete()` was called client-side, leaving all Firestore data orphaned.
- On success the session cookie is cleared via `logout()` and the user is redirected to `/login`.

---

## [4.9.2] - 2026-05-23

### Fixes
- **Navbar buttons**: calculator button is now icon-only (label removed) and matches the icon-button style of the Help and Sign Out buttons (`bg-gray-800` resting state, `hover:bg-gray-600`).
- **Help dropdown**: added `overflow-hidden` to prevent rounded corners being clipped by child hover backgrounds.

---

## [4.9.1] - 2026-05-23

### Fixes
- **Email notifications**: removed emojis from all subject lines and headings (WHY reminder, partner alert variants). Subjects now use a plain `ProfitPulse:` prefix.
- **Email copy**: replaced em dash in WHY reminder body with parentheses.

---

## [4.9.0] - 2026-05-23

Navigation overhaul, futures calculator, journal history, auth flow fixes, and in-app contact.

### New Features

#### In-app contact form
- **Help dropdown** in navbar (? icon) replaces the floating FeedbackWidget. Items: Request a feature, Report a bug, Learning Resources, Contact Developers.
- **Contact Developers modal**: subject selector + message textarea (20-char minimum). Sends via Resend to `hello@profitpulse.app` with the sender's email as `Reply-To`. Rate-limited to one message per user per 24 hours (enforced server-side via Firestore).

#### Futures market support in Lot Size Calculator
- Added 8 futures contracts: ES ($12.50/tick), MES ($1.25), NQ ($5.00), MNQ ($0.50), YM ($5.00), MYM ($0.50), CL ($10.00), GC ($10.00).
- Futures branch: `contracts = floor(riskAmount / (stopLoss × tickValue))`. Output labelled "Contracts" with tick reference displayed.
- Instrument dropdown now grouped by category (Forex, Metals, Indices, Energy, Crypto, Futures).

#### Journal history in Profile
- New accordion in the Profile page: browse past gratitude journal entries with server-side cursor pagination (7 per page, `orderBy('day', 'desc')`). Client-side search filters across all loaded entries.

#### Sidebar profile footer + collapsible Pulses
- **Profile footer**: avatar (photo or initials), display name, email, and settings-icon-on-hover moved to sidebar bottom. Ring highlights on hover.
- **Collapsible Pulses**: active pulses listed as sub-links under the Pulses nav item. Auto-expands when navigating to a pulse detail page.
- Desktop collapsed state: icon-only; profile footer shows avatar circle only.
- Mobile bottom nav updated: Dashboard | Pulses | Profile (three items).

### Fixes
- **Login flash**: login page showed the form briefly even when the user was already authenticated and had journaled for the day. Guard added: `if (loading || user) return null`.
- **Blank body post-logout**: logout now calls `router.replace('/login')` after `await logout()`, preventing the user from remaining on a protected page with an empty shell.
- **Sign-out dialog persistence**: `confirmLogout` state now resets on auth change, so signing back in doesn't leave the dialog open.
- **Pulse sidebar links**: sidebar was using `pulse.firestoreId` in hrefs; `getPulseById` queries by `pulse.id` (e.g. `TRAD052306`). Fixed to use `pulse.id`.

### Internal
- Root layout restructured to `flex-col` (Navbar full-width → inner `flex` row for Sidebar + main).
- `src/config/navigation.ts` exports separate `navigationLinks` (desktop) and `mobileNavLinks` (mobile).
- `src/types/css.d.ts` added to declare `*.css` side-effect imports for TypeScript.
- `POST /api/contact` route: bearer token auth, Firestore rate-limit, Resend email dispatch.

---

## [4.7.2] - 2026-05-23

### Fixes
- **Build**: drop orphaned `currentScore`/`pulseData` reads in the discipline history route. The v4.6.1 baseline fix made them unused; ESLint was failing the build under `no-unused-vars`.

---

## [4.7.1] - 2026-05-23

### Fixes
- **Build**: profile page failed compilation under `no-unused-expressions` because a ternary in the journal "Show more/less" toggle was used purely for its side effects. Swapped to `if/else` — same behaviour, lint-clean.

---

## [4.7.0] - 2026-05-23

Reward system overhaul: per-section engagement credit, rebalanced YELLOW/RED recovery caps.

### New Features
- **Engagement credit**: trades earn up to +4 recovery pts/day based on which optional sections are filled (psychology, context, reflection, learnings — 1 pt each). Engagement credit applies even on days with violations, so thorough journaling on a bad day still rewards reflection. Capped at +4/day so it can't out-pace clean-session bonuses.

### Behaviour changes
- **Recovery caps rebalanced**: YELLOW 10→15, RED 5→10, GREEN 13→15. A single −20 overtrading breach in RED is now recoverable in 2–3 days of clean sessions instead of 4+. Clean-session bonuses remain the fast lane to recovery.

### Fixes
- **Dead-letter `whatILearned` bonus removed**: the engine was checking `trade.reflection.whatILearned` for the +3 full-journal bonus, but the form never writes that field — the bonus was unreachable. Replaced with the per-section engagement credit which reads fields the form actually collects.

### Internal
- `SessionSummary.hasFullJournal` deprecated (still populated for backwards compat, but no longer drives recovery). New `engagementScore: number` field is the source of truth.

---

## [4.6.1] - 2026-05-23

Discipline engine bug fixes: history chart baseline, risk-cap detection, and overtrading severity.

### Fixes
- **Discipline Score History chart**: chart was using the live (post-penalty) score as the starting baseline, making the "+X pts this period" delta always near zero. Now reads the most recent `violationLog` entry *before* the selected range to establish a true baseline; falls back to 100 for brand-new pulses.
- **Risk-cap enforcement**: `evaluateViolations` was comparing trade risk against `maxRiskPerTrade` (the raw pulse limit), ignoring the active `riskCapPct` constraint. A 75% cap was invisible to the engine — the real-time form indicator showed the cap, but server-side detection missed it. Now resolves `effectiveRiskLimit = maxRiskPerTrade × riskCapPct` before comparison; violation details include `(75% cap active)` for clarity.

### Behaviour changes
- **Overtrading consequences strengthened**: `MAX_TRADES_PENALTY` bumped −8 → −20 (matches `NO_TRADE_DAY_VIOLATED`). Every `MAX_TRADES_PER_DAY` breach now sets `noTradeDays = 1` immediately, blocking further trades today and tomorrow. The existing first-weekly `tradeCapCount` logic still applies.

---

## [4.5.0] - 2026-05-23

Pulse detail page UI/UX refinements: unified tabs + panel, new "By Day" trade view, calendar day-picker fix, and a richer Trade Details modal.

### New Features

#### Unified tabs + content
- Tabs (Performance / Discipline / Trade Log) and the active panel now share a single bordered card. The selected tab uses an underline indicator that visually connects to the panel below — content clearly belongs to the active tab.
- Subtle translucent `bg-white/[0.015]` overlay on the panel area to lift the content surface without adding visual weight.
- Performance tab's date range + comparison controls moved onto the tab row itself (only visible when the Performance tab is active). Saves a row of vertical space and creates a more compact layout.

#### "By Day" trade view (new default)
- New `viewType: "by-day"` is now the default in the Trade Log tab. Trades are grouped by calendar day with a collapsible header showing count, win rate, and total P/L. Most recent day auto-expands.
- Expanded rows show compact trade entries — type badge, instrument, entry reason snippet, entry time, P/L — clickable to open the full trade details.
- View toggle reordered: **By Day** (default) → **Table** → **Calendar**, with `Layers` icon for the new option.

#### Calendar day-picker
- Clicking a day with multiple trades used to open only `dayTrades[0]`. Fixed: 1 trade opens directly; 2+ trades open a small picker modal listing all trades for that day so the trader can choose which to inspect.

#### Trade Details — review-grade detail
- Headline summary strip: type badge + instrument + outcome pill + bold P/L with %-of-account and R-multiple.
- **Risk & R-Multiple** section (when engine metrics present): Intended Risk %, Planned R:R, Actual R, Exit Quality with contextual hints.
- **Discipline** section: per-trade violations in a red-bordered card with severity badges, plus the rules followed list.
- **Plan & Reflection** section: entry reason, learnings, would-repeat, emotional impact, mistakes identified (bulleted), improvement ideas.
- **Psychology** section: emotional state + intensity, mental state, plan adherence, impulsive entry — color-coded.
- **Context** section: market condition, time of day, environment.
- **Screenshots** section: entry/exit thumbnails opening in a new tab.
- Each section renders only when its data is present.

### Fixes
- LimitsTracker collapsible header padding tightened (`py-3` → `py-2`); expanded content rebalanced (`pt-1` + bars `mt-3` → unified `pt-3`).

---

## [4.4.0] - 2026-05-20

Adaptive enforcement engine: per-pulse choice between Score-based and Severity-based tier ladders.

### New Features

#### Unified tier ladder driven by a per-pulse signal
- Discipline engine restructured around a single tier ladder (Tier 1–5) shared across all violation types. Tier outcomes (75% cap → 50% cap + warning → NTD + 50% cap → extended NTD) are the same regardless of mode; only the trigger signal differs.
- Each pulse picks one of two enforcement modes at creation:
  - `SCORE_BASED` (default): tier triggered by discipline score crossing thresholds (≥85, ≥70, ≥55, ≥40). Recovery is action-based via clean sessions, journal bonuses, streaks.
  - `SEVERITY_BASED`: tier triggered by weekly cumulative violation severity (5, 15, 25, 40). Recovery is time-based via Monday reset.
- `EnforcementModeDetailsModal` side-by-side comparison surfaced from both CreatePulseModal and UpdatePulseModal via "Learn more". Existing pulses default to `SCORE_BASED` via read-time fallback.

#### Warn-then-lock at tier 4
- First time a trader crosses into tier 4 territory the engine sets `ntdWarningPending = true` and applies only the 50% cap (no immediate NTD). The trader gets explicit advance notice via an amber "NTD on next breach" chip in the DisciplineMeter. The next tier-4 condition fires the actual no-trade day.
- NTD now extends by 1 day when triggered during an active NTD (previously `Math.max(1, 1) = 1` left it unchanged).

#### WHY reminder on first risk breach
- Per spec, "breach 1 = WHY prompt only" — but the email/SMS only fired on zone degradation, so first-ever risk breaches dropping from 100 → 95 stayed silent. Now fires the WHY reminder on first weekly RISK_PER_TRADE breach regardless of zone state.

#### Accountability partner alerts wired to the tier ladder
- `PartnerAlertBreachType` union extended with `NTD_WARNING` and `NO_TRADE_DAY` so the partner gets notified when the engine escalates regardless of which violation type triggered it.
- One alert per trade, picked by priority: `TOTAL_DRAWDOWN_LOCKED` > `NO_TRADE_DAY` > `DAILY_DRAWDOWN` > `NTD_WARNING`. Prevents partner inbox spam when a single trade trips multiple signals.
- Mode-independent — works the same in Score-based and Severity-based pulses since both flow through `noTradeDays` / `ntdWarningPending` state.

### Schema
- New `EnforcementMode` type in `disciplineTypes.ts`.
- `PulseDisciplineFields` gains `enforcementMode` and `weeklySeverityTotal`.
- `ActiveConstraints` gains `ntdWarningPending`.

### Fixes
- Removed accidental "breach 1 with no cap → 75% cap" escalation introduced in v4.3 — first weekly risk breach now correctly fires WHY-only with no cap, matching the spec.
- Severity total resets to 0 alongside `weeklyBreachCounts` on the Monday boundary.

---

## [4.3.0] - 2026-05-20

Pulse Detail Page UX Refactor: tabbed layout for Performance / Discipline / Trade Log with persistent Vitals strip.

### New Features

#### Tabbed Pulse Detail Layout
- New top-level navigation on the pulse detail page splits content into three focused tabs: **Performance** (KPIs + equity curve), **Discipline** (score, meter, limits, score-over-time chart, violations), and **Trade Log** (table/calendar).
- New `PulseTabs.tsx` component — accessible tab navigation with `role="tablist"`/`role="tab"`, optional per-tab badges (used to surface the active-constraint count on the Discipline tab).
- Tab state is persisted to the URL as `?tab=performance|discipline|trades` via `router.replace(..., { scroll: false })` — survives refresh, supports back/forward navigation, and shareable links.
- **Smart default tab**: opens to Discipline when active constraints exist, zone ≠ GREEN, or a reflection gate is pending; otherwise defaults to Performance.

#### Persistent Vitals Strip
- New `PulseVitals.tsx` — always-visible compact strip above the tabs.
- Shows zone label + score, today's P/L (color-coded), today's trade count (vs daily cap when set), consecutive clean-day streak (when > 0), and a button that jumps to the Discipline tab when constraints are active.
- Guarantees critical discipline state never gets hidden behind a tab choice.

#### Global Log Trade Button
- Added a primary `+ Log Trade` CTA to `PulseHeader` so trade logging is reachable from any tab.
- Disabled state shown when the pulse is locked.

### Removed
- `ChartsCard.tsx` — the tabbed-chart pattern (Equity Curve | Discipline Score) is obsolete now that each chart lives in its own tab with a dedicated card header.

### Fixes
- Removed `overflow-hidden` from the `PulseHeader` container that was clipping the actions dropdown menu.
- Tab change no longer scrolls the page to top (`scroll: false` on `router.replace`).

---

## [4.2.0] - 2026-05-19

Phase 3 - Sprint 2: Multi-session Risk Cap Countdown, DisciplineMeter UX Overhaul, Streak Badge, and Premium Empty States.

### New Features

#### Multi-Session Risk Cap Countdown (Option B)
- Updated `enforcementEngine.ts` to require multiple consecutive clean sessions before lifting lockouts or risk caps.
- Caps triggered by Daily Drawdown breaches require 3 clean sessions to lift.
- Caps triggered by Total Drawdown breaches (prior to permanent lockout) require 5 clean sessions to lift.
- `ActiveConstraints` model expanded to track `cleanSessionsToLift`.
- `LimitsTracker` UI now displays a dynamic countdown warning banner when constraints are active and waiting to be lifted.

#### Discipline Meter UX Redesign
- Extracted `DisciplineMeter` from `PulseHeader` to clearly separate behavioural metrics from general Pulse configuration.
- Solved cognitive dissonance by giving "Today's Execution" its own visual circular progress ring, distinctly separated from the lifetime "Discipline Score" horizontal gradient bar.
- Constraint badges inside the meter auto-hide during clean trading, reappearing only when restrictions are triggered.

#### Streak Badge
- Created `StreakBadge.tsx` alongside the DisciplineMeter.
- Automatically tracks `consecutiveCleanDays` and prominently displays a "Hot Streak" flame animation when a streak hits ≥3 days.

#### Premium Empty States
- Designed premium empty states for `PulsesTable.tsx` (Dashboard) and `TradeHistory.tsx` (Pulse Detail) with custom illustrations, welcoming copy, and primary CTA buttons to guide new users into the core loop.

### Fixes
- Added missing `cleanSessionsToLift` default property in `evaluate/route.ts` and `disciplineTypes.ts`.
- Removed unused props from `PulseHeader` and fixed strict TypeScript lint errors.
- Corrected Firestore index `queryScope` for `violationLog` queries from `COLLECTION_GROUP` to `COLLECTION`.

## [4.1.0] - 2026-05-19

Phase 3: Streak tracking, notification engine (email + SMS-ready), discipline score
history chart, in-app WHY reminder banner, and accountability partner settings.

### New Features

#### Streak Tracking
- Added `consecutiveCleanDays` counter to `PulseDisciplineFields`.
- Counter increments when the previous trading session was clean (≥1 trade, 0 violations).
  Resets to 0 on any violation. No-trade days are neutral.
- +10 streak bonus applied after 3+ consecutive clean days (via `computeRecovery`).
- Counter persisted to Firestore on every trade evaluation and exposed in the API response.

#### Notification Engine
- **Resend (email)**: New `src/services/notifications/emailService.ts`.
  - `sendWHYReminder()` — Tier 1 reminder email sent to the trader when zone degrades.
  - `sendPartnerAlert()` — Tier 2 alert email sent to the accountability partner on daily
    drawdown breach or terminal lockout.
  - Requires `RESEND_API_KEY` and `RESEND_FROM_EMAIL` env vars to activate.
- **Twilio (SMS stubs)**: New `src/services/notifications/smsService.ts`.
  - Fully structured with matching templates (`sendWHYReminderSMS`, `sendPartnerAlertSMS`).
  - Runs in mock/log mode until Twilio env vars are configured — zero payments required.
  - Activation: add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`
    and uncomment the client block.
- Notifications wired into `POST /api/discipline/evaluate` — all fire-and-forget (non-blocking).

#### Discipline Score History Chart
- New `GET /api/discipline/history?pulseId=&range=` endpoint.
  - Supports ranges: 7D | 30D | 90D | 1Y | ALL.
  - Queries `violationLog` subcollection, groups by date, carries forward score on empty days.
- New `DisciplineChart.tsx` component (Chart.js / react-chartjs-2).
  - Multi-coloured line (green/yellow/red per score).
  - Background zone bands at GREEN (75+), YELLOW (40–74), RED (<40) thresholds.
  - Interactive range selector matching dashboard time-range style.
  - Period delta ("±N pts") summary.
- Rendered on Pulse detail page below `LimitsTracker`.

#### WHY Reminder Banner
- New `WHYReminderBanner.tsx` component.
  - Shown on the Pulse detail page when discipline zone is YELLOW or RED.
  - Displays the trader's `whyStatement` and `whyDiscipline`.
  - Dismissible per browser session per calendar day (sessionStorage key).

#### Accountability Partner Settings
- `UpdatePulseModal` now includes an "Accountability Partner Email" input.
  - Optional field with email format validation.
  - Saved to `discipline.accountabilityPartnerEmail` on the Pulse document.
  - Pre-populated from existing pulse data.
- Partner email is used by the notification engine for Tier 2 breach alerts.

## [4.0.0] - 2026-05-17

A security and architecture release: real server-side authentication enforcement,
a new public landing page, and a mandatory daily journal gate. Core app flow has
changed — see **Breaking Changes**.

### Breaking Changes

- **App home moved**: `/` is now a public marketing/landing page. The authenticated
  app home is `/dashboard`. All post-auth redirects now target `/dashboard`.
- **Mandatory daily journal gate**: Signed-in users must complete a once-per-day
  journal entry at `/journal` before any app route is reachable. Enforced in
  middleware via an httpOnly cookie keyed to the UTC day.
- **Removed modules**: Deleted duplicate/legacy auth and profile modules
  (`src/services/auth.ts`, `src/hooks/useAuth.ts`,
  `src/services/firebase/userService.ts`, `src/services/users.ts`,
  `src/utils/adminSetup.ts`, dead `src/utils/middleware.ts`, and the
  localStorage-based `GratitudeJournal` component). Consumers migrated to the
  unified `useAuth()` and the server-side `/api/users` route.

### Authentication & Session Enforcement

- **Real middleware gate**: Added `src/middleware.ts` (Edge) performing a
  cookie-presence check — replaces the dead, never-executed `src/utils/middleware.ts`.
- **Session cookie API**: New `POST/DELETE /api/auth/session` (Node runtime) mints
  and clears an httpOnly Firebase session cookie via the Admin SDK.
- **Centralized session minting**: `AuthContext.onAuthStateChanged` now establishes
  the session cookie for both login and signup (fixes signup never receiving one).
- **Unified auth surface**: Single `useAuth()` hook exposing state + actions;
  consolidated three divergent `setSessionCookie` implementations into one.
- **Logout hardening**: All logout paths now clear the server session cookie.

### Security Hardening

- **Privilege-escalation fix**: Firestore rules now reject client-side `role`
  writes on user profile create/update; role provisioning is server-only.
- **Server-side profile path**: New `/api/users` route (Node) performs profile
  CRUD with the role forced to `user`; client can no longer self-assign roles.
- **Token verification**: All API routes derive the uid from a verified Bearer
  token with `checkRevoked=true`; uid is never trusted from the request body.
- **Admin setup**: `/api/admin/setup` now verifies a Bearer token and derives the
  caller's uid server-side instead of trusting the request body.
- **Security headers**: Added HSTS, `X-Frame-Options: DENY`,
  `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy`.

### Features

- **Public landing page**: `/` is now a marketing page with conditional CTAs
  (signed-in → dashboard, signed-out → get started / sign in).
- **Daily journal gate**: New `/journal` page and `POST/GET /api/journal` route.
  Entries persist to Firestore under `users/{uid}/journal/{UTC-day}`; a shared
  UTC day-key keeps the middleware check and API write timezone-consistent.

### Fixes

- **Login error flash**: `handleRedirectResult()` no longer returns an error for
  the normal "no Google redirect in progress" case, removing the spurious
  "No redirect result" red text on `/login` load.

## [3.1.0] - 2026-05-14

### Terminal Lockout (Prop-Firm Hardening)

Complete enforcement of the permanent "Locked" account state for ultimate drawdown breaches, bringing full consistency across the API and Firestore database layers.

- **Permanent Constraints**: Replaced temporary daily penalties with an absolute terminal lockout (`isLockedPermanently`) in `enforcementEngine.ts` when Total Drawdown limit is breached.
- **Server-Side Firestore Sync**: Updated evaluation API to trigger an atomic Firestore `status: 'locked'` write upon terminal violation detection.
- **Lazy Status Migration**: Implemented proactive legacy migration gate inside the `evaluate` API. Legacy pulses pre-dating the "Locked" status are auto-updated in Firestore to `locked` upon the next trade evaluate call.
- **Enforcement Rejection (403)**: Evaluator API strictly rejects trade attempts on locked pulses with `403 Forbidden`.

### UX Polish & Input Verification

- **Dynamic Error UI**: Refactored `TradeFormModal` parsing logic to extract specialized `apiError` state from `usePulse` hooks, preventing duplicate toasts and feeding detailed backend error strings (e.g., "This pulse is permanently locked") into the form UI.
- **Future-Date Guard**: Blocked future-dated trade logging via both:
  - Native browser calendar restriction (`max` attribute on date inputs).
  - State-level Javascript logic inside the main `validateForm()` hook.
- **Unified UI Styling**: Ensured consistent "Add Trade" button lockout logic across both `TradeHistory` and `TradeCalendar` views, using reduced-opacity states and precise user-facing tooltip explanations.
- **Constant Localization**: Centralized hardcoded titles and error responses inside `src/types/pulse.ts` under a single, reusable `PULSE_MESSAGES` object for enhanced codebase DRYness.

## [3.0.0] - 2026-05-09

### Major Features

#### Discipline Engine — Phase 1 (Foundation: Score + Meter)

A closed-loop behavioural system that scores rule violations and displays an adaptive discipline meter. Phase 1 is observational only — violations are detected and scored, but no enforcement constraints (caps, lockouts, gates) are active.

- **Violation Detection**: Auto-detects 5 quantitative violation types (risk per trade, daily drawdown, total drawdown, max trades/day, overtrading) and qualitative violations (required/optional rule misses).
- **Score Penalties**: Escalating penalties per violation type, with zone amplification (Green 75–100, Yellow 40–74, Red 0–39).
- **Lazy Session Recovery**: On first trade of a new day, the engine evaluates yesterday's session and awards recovery points (+8 clean session, +3 full journal, +2 all rules followed, +10 streak bonus).
- **Weekly Breach Count Tracking**: Tracks risk, drawdown, and overtrading violations per week. `drawdownTotal` is a lifetime counter.
- **Rich Breach Notifications**: Custom toast UI categorising violations (Rules Missed vs. Risk & Limits) with penalty badges and total impact summary.

#### Instrument Point Value System

- **Lookup Table**: 30+ common instruments (NQ, ES, MNQ, MES, GC, CL, EURUSD, GBPUSD, etc.) with pre-configured dollar-per-point values.
- **Per-Instrument Config**: Point value fields shown inline with each instrument tag at Pulse creation and update, auto-populated from lookup table, user-editable.
- **Accurate Risk Calculation**: Risk formula now uses `|entry − SL| × pointValue × lots / accountSize` instead of raw price difference, making it accurate for Futures, Forex, and Stocks.

#### WHY Onboarding Step

- **Two-Step Pulse Creation**: Config → WHY commitment flow.
- **WHY Fields**: "What is driving you to trade?" and "What does following your rules mean for you?" (30-char minimum each).
- **Stored on Pulse Document**: Used in future notification tiers.

#### Discipline Meter UI

- **Gradient Meter**: Red→Yellow→Green gradient bar with score marker and zone label (Stable / At Risk / Enforcement).
- **Session Rule Score Badge**: Daily execution grade computed from today's rule compliance.
- **Recovery Path Hint**: Contextual guidance shown when zone ≠ Green.

### Trade Data Enhancements

- Added `plannedSL` and `plannedTP` fields to trade form.
- Engine-derived metrics stored per trade: `intendedRiskPct`, `intendedRR`, `actualR`, `exitQuality`, `violations[]`.
- Violation log subcollection for audit trail.

### Pulse Document Updates

- Added `discipline` field: `disciplineScore`, `disciplineState`, `activeConstraints`, `lastSessionDate`, `reflectionGatePending`, `weeklyBreachCounts`, `whyStatement`, `whyDiscipline`.
- Added `instrumentPointValues` (Record<string, number>) for per-instrument point value config.

### UI/UX Improvements

- Instrument input upgraded from comma-separated text to tag-based input with inline point value editing (both Create and Update modals).
- Consistent instrument UX across Create and Update Pulse flows.



## [2.0.0] - 2026-02-06

### Major Breaking Changes

#### Trade Data Structure Overhaul

- **Nested Data Model**: Migrated trade data from flat structure to nested objects:
  - `execution`: Entry/exit details, prices, lot size
  - `performance`: Profit/loss metrics
  - `psychology`: Emotional state, discipline tracking
  - `context`: Market conditions, environment
  - `reflection`: Post-trade analysis
- **BREAKING CHANGE**: Existing trade data is not compatible with this version. Users must delete existing trades.
- **Full Stack Update**: Updated all layers (Types, API, Forms, UI, Services) to support the new structure.
- **Enhanced Validation**: Improved server-side validation for nested data structures.

## [1.3.0] - 2026-02-06

### Major Refactoring

#### Trade Modal Architecture Overhaul

- **Unified Trade Form Modal**: Refactored `AddTradeModal` and `UpdateTradeModal` into a single `TradeFormModal` component
  - Eliminated **800+ lines** of duplicated code (57% reduction)
  - Implemented mode-based pattern (`create` | `update`) for cleaner architecture
  - Extracted shared form components into reusable modules:
    - `TradeDataForm` - Core trade data entry
    - `PsychologyForm` - Emotional and mental state tracking
    - `ContextForm` - Market conditions and environment
    - `ReflectionForm` - Post-trade analysis
    - `TradingRulesSection` - Trading rules checklist
  - Added tab-based interface with completion indicators
  - Improved maintainability with shared TypeScript types

### Critical Bug Fixes

#### Firebase Data Persistence

- **Fixed Firebase undefined values error**: Added filtering to remove `undefined` fields before Firestore submission
- **Fixed update modal data loading**: Implemented `useEffect` to reinitialize form data when trade prop changes
- **Fixed emotional intensity defaulting to 5**: Changed from `||` to `??` (nullish coalescing) to properly handle `0` values
- **Fixed reflection data not persisting**: Corrected boolean field handling to preserve `false` values
- **Fixed UI not refreshing after updates**: Implemented refresh callback chain from page → TradeHistory/TradeCalendar → TradeDetailsModal → UpdateTradeModal

#### Data Flow Improvements

- Added `onRefresh` callback prop to `TradeHistory` and `TradeCalendar` components
- Connected refresh callbacks to `fetchPulse()` in pulse page for real-time UI updates
- Ensured automatic UI refresh after trade creation/update without page reload

### Features

#### Enhanced Trade Editing

- **Full field editing**: Users can now edit all trade fields including:
  - Psychology data (emotional state, intensity, mental state, plan adherence)
  - Context data (market conditions, time of day, trading environment)
  - Reflection data (would repeat, emotional impact, mistakes, improvements)
- **Data preservation**: All existing trade data correctly populates in update modal
- **Real-time updates**: Changes reflect immediately in UI without manual refresh

#### Improved Form Handling

- Better validation for entry/exit times
- Explicit undefined checks for optional boolean fields
- Proper type casting for numeric values
- Enhanced error messages for validation failures

### Refactoring

#### Component Structure

- Created `components/modals/trade-form/` directory for organized form components
- Moved shared types to `components/modals/trade-form/types.ts`
- Reduced `AddTradeModal.tsx` to 23-line wrapper
- Reduced `UpdateTradeModal.tsx` to 40-line wrapper

#### Code Quality

- Removed all debug `console.log` statements
- Improved TypeScript type safety across form components
- Consistent prop interfaces for form sections
- Better separation of concerns

### Documentation

- Created comprehensive refactoring walkthrough
- Documented all bug fixes with root cause analysis
- Added lessons learned section for future development
- Included testing checklist for QA

## [1.2.0] - 2025-03-12

### Features

#### One-Time Pulse Update Functionality

- Added update tracking (hasBeenUpdated, lastUpdate) to the Pulse interface.
- Implemented UpdatePulseModal with form validation and error handling.
- Enhanced PulseHeader with risk rules display and status indicators.
- Added rule violations display for locked pulses.
- Improved mobile responsiveness for risk rules display.

#### Profit Factor Calculation & Stats Card

- Implemented profit factor calculation.
- Added a dedicated stats card to display profit factor.

#### Improved Number Formatting & Layout

- Added `formatCurrency` and `formatRatio` utility functions.
- Implemented consistent number formatting across all components.
- Introduced visual section dividers in the Pulse page for better UI structure.
- Improved component organization with semantic sections.

#### Enhanced Home Page

- Added a digital clock component with date display.
- Implemented daily trading quotes with Firestore integration.
- Added a gratitude journal component with local storage support.
- Improved overall page styling and responsiveness.

### Enhancements

#### Enhanced Modals for Mobile Responsiveness & Scrollability

- Updated all modal components to ensure proper scrolling and mobile responsiveness.
- Added `overflow-y-auto` to handle content overflow.
- Applied `max-h-[90vh]` to prevent modals from exceeding the viewport height.
- Ensured modals are centered using flexbox, with consistent padding and width constraints.
- Improved `z-index` handling (`z-50`) to ensure modals appear above other content.

### Fixes

#### Removed Unused Variable

- Eliminated `lossPercentage` variable from the `createTrade` function to improve code cleanliness.

### Refactor

#### Reorganized Project Directory Structure

- Refactored the project structure for better maintainability and scalability.

### Security & Admin Updates

#### Implemented Firebase Admin SDK for Admin User Setup

- Integrated Firebase Admin SDK to bypass Firestore security rules where necessary.
- Updated admin setup API route to use Admin SDK credentials.
- Refined Firestore security rules for proper user management.
- Fixed permission issues preventing admin user creation.
