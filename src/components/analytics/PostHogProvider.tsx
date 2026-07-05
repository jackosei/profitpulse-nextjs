"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";

/**
 * Captures a `$pageview` on every App Router navigation. Next.js does not fire
 * pageviews automatically, and `useSearchParams` forces this subtree to render
 * client-side — hence the Suspense boundary in the provider.
 *
 * PostHog is initialised in instrumentation-client.ts (Next.js 15.3+) before
 * the React tree mounts — this component only handles pageview tracking.
 */
function PageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname || !(posthog as unknown as { __loaded?: boolean }).__loaded)
      return;
    let url = window.origin + pathname;
    const qs = searchParams?.toString();
    if (qs) url += `?${qs}`;
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}

export default function PostHogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense fallback={null}>
        <PageView />
      </Suspense>
      {children}
    </>
  );
}
