# ProfitPulse - Trade Tracking Made Simple

ProfitPulse is a Next.js application for tracking and analyzing trading performance.

## Project Structure

The project follows a well-organized directory structure:

```
src/
├── app/                   # Next.js app router pages
├── components/
│   ├── auth/              # Authentication components
│   ├── layout/            # Layout components
│   ├── ui/                # Reusable UI components
│   ├── features/          # Feature-specific components
│   ├── dashboard/         # Dashboard-specific components
│   ├── pulse/             # Pulse-specific components
│   └── modals/            # Modal components
├── context/               # React context providers
├── hooks/                 # Custom React hooks
├── services/              # API and Firebase services
│   ├── auth.ts            # Authentication services
│   ├── firestore.ts       # Firestore services
│   └── api/               # Other API services
├── types/                 # TypeScript type definitions
└── utils/                 # Utility functions
```

## Getting Started

1. Clone the repository
2. Install dependencies with `yarn install`
3. Set up environment variables (see `.env.example`)
4. Run the development server with `yarn dev`

## Features

- User authentication
- Trade tracking and analysis
- Performance metrics and visualization
- Dashboard with key statistics
- Gratitude journaling

## Technologies

- Next.js 14
- React
- TypeScript
- Tailwind CSS
- Firebase (Authentication, Firestore)
