# ProfitPulse - Trade Tracking Made Simple

ProfitPulse is a Next.js application for tracking and analyzing trading performance.

## Project Structure

The project follows a well-organized directory structure:

```
src/
├── middleware.ts          # Edge auth gate (session presence + daily journal gate)
├── app/                   # Next.js app router pages
│   └── api/               # Route handlers (Node runtime)
│       ├── auth/session/  # Mint/clear httpOnly Firebase session cookie
│       ├── users/         # Server-side profile CRUD (role forced server-side)
│       ├── journal/       # Daily journal persistence + gate cookie
│       └── admin/setup/   # Token-verified one-time admin provisioning
├── components/
│   ├── auth/              # Authentication components
│   ├── layout/            # Layout components
│   ├── ui/                # Reusable UI components
│   ├── features/          # Feature-specific components
│   ├── dashboard/         # Dashboard-specific components
│   ├── pulse/             # Pulse-specific components
│   └── modals/            # Modal components
├── context/               # React context providers (AuthContext + unified useAuth)
├── hooks/                 # Custom React hooks
├── services/              # API and Firebase services
│   ├── admin.ts           # Firebase Admin SDK (server-side adminDb / adminAuth)
│   ├── firebase/          # Client Firebase services (auth, firestore)
│   └── api/               # App-facing API clients
├── config/                # Route/navigation config (route lists, app home)
├── types/                 # TypeScript type definitions
└── utils/                 # Utility functions
```

## Getting Started

1. Clone the repository
2. Install dependencies with `yarn install`
3. Set up environment variables (see `.env.example`)
4. Run the development server with `yarn dev`

## Features

- Public marketing landing page (`/`)
- Server-side enforced authentication (Edge middleware + httpOnly Firebase session cookie)
- Mandatory daily journal gate (`/journal`) before app access
- Trade tracking and analysis
- Performance metrics and visualization
- Dashboard with key statistics
- Discipline engine with violation scoring and enforcement

## Authentication Model

- Sign-in/up via the Firebase client SDK (Google + email/password).
- On auth, an httpOnly Firebase **session cookie** is minted server-side via
  `/api/auth/session` (Admin SDK, Node runtime).
- `src/middleware.ts` runs on the Edge: it gates app routes on session presence
  and on a once-per-day journal cookie, and keeps the public landing page open.
- API routes verify a Bearer ID token (`checkRevoked=true`) and never trust a
  client-supplied uid. User roles are assigned server-side only.

## Technologies

- Next.js 15 (App Router)
- React
- TypeScript
- Tailwind CSS
- Firebase (client Auth + Firestore, Admin SDK for server routes)
