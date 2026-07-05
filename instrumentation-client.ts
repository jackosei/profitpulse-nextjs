import posthog from "posthog-js";

// Only initialise when a key is configured, so builds/environments without
// PostHog (CI, local without the key) don't init a client with an undefined
// token — every downstream track() call then no-ops cleanly.
if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: "/ingest",
    ui_host: "https://us.posthog.com",
    defaults: "2026-01-30",
    person_profiles: "identified_only",
    capture_pageview: false,
    capture_exceptions: true,
    autocapture: true,
    debug: process.env.NODE_ENV === "development",
  });
}
