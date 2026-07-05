/**
 * Thin, typed analytics facade over posthog-js.
 *
 * Every helper here no-ops safely when PostHog is not configured
 * (`NEXT_PUBLIC_POSTHOG_KEY` unset) or when called before the client has
 * initialised — so product code can call `track(...)` unconditionally without
 * guarding, and dev/CI/self-hosters aren't forced to configure analytics.
 *
 * Client-side only: posthog-js touches `window`. Do not import from server
 * components or route handlers.
 */

import posthog from "posthog-js";

/** The product events we emit. Keep this list the single source of truth. */
export type AnalyticsEvent =
  | "sign_up"
  | "sign_in"
  | "demo_login"
  | "pulse_created"
  | "trade_logged"
  | "contact_submitted";

function ready(): boolean {
  return (
    typeof window !== "undefined" &&
    // __loaded flips true once posthog.init() has run.
    (posthog as unknown as { __loaded?: boolean }).__loaded === true
  );
}

/** Capture a product event. Silently ignored if analytics isn't ready. */
export function track(
  event: AnalyticsEvent,
  properties?: Record<string, unknown>,
): void {
  if (!ready()) return;
  posthog.capture(event, properties);
}

/** Report a caught error to PostHog error tracking. */
export function trackException(error: unknown): void {
  if (!ready()) return;
  posthog.captureException(error);
}

/**
 * Associate subsequent events with a user. `is_demo` is registered as a
 * super-property so the real-user funnel can exclude the shared demo account.
 */
export function identifyUser(
  uid: string,
  props: { email?: string; is_demo?: boolean },
): void {
  if (!ready()) return;
  posthog.identify(uid, props);
  posthog.register({ is_demo: props.is_demo ?? false });
}

/** Clear the identified user (call on sign-out). */
export function resetUser(): void {
  if (!ready()) return;
  posthog.reset();
}
