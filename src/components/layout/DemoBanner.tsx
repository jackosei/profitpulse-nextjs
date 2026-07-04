"use client";

import { useAuth } from "@/context/AuthContext";
import { Sparkles } from "lucide-react";
import Link from "next/link";

/**
 * Persistent strip shown while browsing as the shared demo account.
 * Rendered in the authenticated app layout; renders nothing for real users.
 */
export default function DemoBanner() {
  const { userProfile } = useAuth();

  if (!userProfile?.isDemo) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-accent/15 border-b border-accent/30 px-4 py-1.5 text-xs text-accent-light">
      <Sparkles size={13} aria-hidden />
      <span>
        You&apos;re exploring the shared demo account. Changes are visible to
        other visitors and reset every few hours.
      </span>
      <Link
        href="/signup"
        className="font-semibold underline underline-offset-2 hover:text-white transition-colors"
      >
        Create your free account
      </Link>
    </div>
  );
}
