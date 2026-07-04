# ProfitPulse — The Trading Journal That Enforces Your Rules

ProfitPulse is a Next.js trade-journaling and performance platform for serious day traders (Forex, Futures, Crypto). Its core differentiator is the **Discipline Engine** — a closed-loop behavioural system that scores rule violations and applies adaptive forward constraints (risk caps, trade caps, no-trade days, lockouts). Unlike conventional journals, ProfitPulse governs what happens *next*, not just what happened.

## Features

### Discipline Engine
- **Violation scoring**: auto-detects quantitative breaches (risk per trade, daily/total drawdown, overtrading) and qualitative rule misses; every violation carries a severity that hits a 0–100 discipline score with zone amplification (Green / Yellow / Red).
- **Two enforcement modes per pulse**: `SCORE_BASED` (tier ladder driven by discipline score, action-based recovery) or `SEVERITY_BASED` (weekly cumulative severity, Monday reset).
- **Unified tier ladder**: 75% risk cap → 50% cap + warning → no-trade day → extended NTD, with warn-then-lock at tier 4. All enforcement is server-side (`/api/discipline/evaluate`) — the client reads state but never computes it.
- **Friction, not blocking**: capped or NTD trades still log via acknowledgement flows (422/409 + ack re-submit); only reflection gates and terminal drawdown locks hard-block.
- **Recovery**: clean sessions, engagement credit for thorough journaling, streak bonuses, reflection gates.
- **Discipline history**: score-over-time chart (7D–ALL ranges) backed by per-day session snapshots (`sessions` subcollection, O(1) history queries).
- **Notifications**: WHY-reminder emails on zone degradation and first risk breach; accountability-partner alerts on escalations (Resend email live, Twilio SMS stubs ready).

### Trading workflow
- **Pulses**: per-strategy containers holding risk parameters, rule checklists, instrument point values, WHY commitments, and engine state.
- **Trade logging**: rich nested trade capture (execution, performance, psychology, context, reflection) with engine-derived metrics (intended risk %, planned R:R, actual R, exit quality). Floating Log Trade button on the pulse page.
- **Pulse detail**: tabbed layout (Performance / Discipline / Trade Log) with a persistent vitals strip; by-day trade view, table, and calendar; review-grade trade details modal.
- **Dashboard** with key statistics and premium empty states.
- **Futures-aware lot size calculator** (Forex, Metals, Indices, Energy, Crypto, Futures contracts).
- **Daily journal gate**: a once-per-day gratitude journal (`/journal`) required before app access, with browsable history in the Profile page.
- **In-app Help & Contact**: feature requests, bug reports, and a rate-limited contact form (Resend).

### Platform
- Public marketing landing page (`/`) with a live demo account.
- Server-side enforced authentication (Edge middleware + httpOnly Firebase session cookie).
- Full cascading account deletion (`DELETE /api/account`).

## Project Structure

```
src/
├── middleware.ts              # Edge auth gate (session presence + daily journal gate)
├── app/
│   ├── (marketing)/           # Public landing page (own full-bleed layout)
│   ├── (auth)/                # Login / signup / forgot-password
│   ├── (app)/                 # Authenticated app shell (Navbar + Sidebar)
│   │   ├── dashboard/ pulses/ pulse/[id]/ profile/ journal/ admin/
│   └── api/                   # Route handlers (Node runtime)
│       ├── auth/session/      # Mint/clear httpOnly Firebase session cookie
│       ├── users/             # Server-side profile CRUD (role forced server-side)
│       ├── journal/           # Daily journal persistence + gate cookie
│       ├── discipline/        # Server-side engine: evaluate, history, reflect, ...
│       ├── account/           # Cascading account deletion
│       ├── contact/           # Rate-limited contact form (Resend)
│       ├── demo/login/        # Demo account login + throttled auto-reset
│       └── admin/setup/       # Token-verified one-time admin provisioning
├── components/
│   ├── auth/ layout/ ui/ features/ dashboard/ pulse/ modals/
│   ├── discipline/            # Meter, limits tracker, gates, charts, banners
│   └── marketing/             # Landing page sections
├── context/                   # React context providers (AuthContext + unified useAuth)
├── hooks/                     # Custom React hooks
├── lib/                       # Discipline engine core (pure, server-consumed)
│   ├── disciplineEngine.ts    # Violation detection + scoring + recovery
│   ├── enforcementEngine.ts   # Tier ladder, constraints, state machine
│   ├── disciplineTypes.ts     # Engine types and enums
│   ├── instrumentPointValues.ts
│   └── demoSeed.ts            # Deterministic demo-account sample data
├── services/
│   ├── admin.ts               # Firebase Admin SDK (server-side adminDb / adminAuth)
│   ├── firebase/              # Client Firebase services (auth, firestore)
│   ├── notifications/         # Resend email + Twilio SMS (stub) services
│   └── api/                   # App-facing API clients
├── config/                    # Route/navigation config (route lists, app home)
├── types/                     # TypeScript type definitions
└── utils/                     # Utility functions

scripts/                       # Admin-SDK maintenance scripts (tsx)
├── backfill-sessions.ts       # Populate per-day session snapshots
├── seed-discipline-test-data.ts
└── seed-demo-data.ts          # Provision + seed the shared demo account
```

## Getting Started

1. Clone the repository
2. Install dependencies with `yarn install`
3. Set up environment variables (see `.env.example`)
4. Run the development server with `yarn dev` (port 9000)

## Demo Account

Visitors can explore the app without signing up via the **Try the live demo** button on `/login`.

- One shared Firebase user (identified by the `DEMO_UID` env var, flagged `isDemo: true` on its user doc) seeded with two sample pulses: a healthy GREEN-zone futures strategy and a YELLOW-zone strategy with active enforcement constraints — so the Discipline Engine is visible in action.
- `POST /api/demo/login` mints a custom token, satisfies the journal gate, and **auto-resets** the demo data when it is older than `DEMO_RESET_HOURS` (default 6h, lease-guarded against concurrent resets).
- The demo user cannot delete the account, delete pulses, or edit the demo profile (enforced server-side + Firestore rules). Everything else is writable — the reset restores canonical data.
- Provision/reseed manually: `npm run seed:demo` (requires Admin SDK env vars).

## Authentication Model

- Sign-in/up via the Firebase client SDK (Google + email/password), plus custom-token sign-in for the demo account.
- On auth, an httpOnly Firebase **session cookie** is minted server-side via
  `/api/auth/session` (Admin SDK, Node runtime).
- `src/middleware.ts` runs on the Edge: it gates app routes on session presence
  and on a once-per-day journal cookie, and keeps the public landing page open.
- API routes verify a Bearer ID token (`checkRevoked=true`) and never trust a
  client-supplied uid. User roles are assigned server-side only.

## Technologies

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Firebase (client Auth + Firestore, Admin SDK for server routes)
- Chart.js, Resend, Twilio (stub)
