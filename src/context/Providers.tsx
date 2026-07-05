"use client";

import { AuthProvider } from "@/context/AuthContext";
import PostHogProvider from "@/components/analytics/PostHogProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  // PostHog wraps Auth so analytics is initialised before AuthContext
  // identifies the signed-in user.
  return (
    <PostHogProvider>
      <AuthProvider>{children}</AuthProvider>
    </PostHogProvider>
  );
}
