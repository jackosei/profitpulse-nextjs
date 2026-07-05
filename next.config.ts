import type { NextConfig } from "next";

// Baseline security headers applied to every response. A strict
// Content-Security-Policy is intentionally NOT set here: Firebase Auth
// (Google sign-in popup/redirect, identitytoolkit, googleapis) needs a
// carefully enumerated CSP that must be validated against the live auth
// flow before enabling — a wrong CSP would silently break login.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

// PostHog reverse proxy: events are sent to first-party `/ingest/*` and
// rewritten to PostHog's hosts server-side, so ad-blockers that block
// posthog.com directly don't drop our analytics. `us`/`eu` host is derived
// from NEXT_PUBLIC_POSTHOG_HOST.
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
const POSTHOG_ASSETS_HOST = POSTHOG_HOST.replace(".i.posthog.com", "-assets.i.posthog.com");

const nextConfig: NextConfig = {
  // Required so PostHog's trailing-slash API paths aren't 308-redirected.
  skipTrailingSlashRedirect: true,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },

  async rewrites() {
    return [
      { source: "/ingest/static/:path*", destination: `${POSTHOG_ASSETS_HOST}/static/:path*` },
      { source: "/ingest/array/:path*", destination: `${POSTHOG_ASSETS_HOST}/array/:path*` },
      { source: "/ingest/:path*", destination: `${POSTHOG_HOST}/:path*` },
    ];
  },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
