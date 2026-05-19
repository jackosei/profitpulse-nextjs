# Changelog

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
