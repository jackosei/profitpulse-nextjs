// Reachable by anyone, signed in or not (marketing/landing).
export const publicRoutes: string[] = ['/']

// Sign-in/up screens — only for signed-out visitors.
export const authRoutes: string[] = ['/login', '/signup', '/forgot-password']

// Daily journal gate: signed-in users must complete it before reaching the app.
export const JOURNAL_ROUTE = '/journal'

// Where signed-in users land after auth (passes through the journal gate).
export const APP_HOME = '/dashboard'

/** UTC YYYY-MM-DD — used by both the middleware gate and the journal API
 * so the "have they journaled today?" check can't drift across timezones. */
export function utcDayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10)
}
