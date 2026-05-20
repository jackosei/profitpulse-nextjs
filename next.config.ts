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

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
