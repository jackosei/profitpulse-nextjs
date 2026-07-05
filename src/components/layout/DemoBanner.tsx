"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Info } from "lucide-react";

/**
 * Persistent strip shown while browsing as the shared demo account.
 * Rendered in the authenticated app layout; renders nothing for real users.
 */
export default function DemoBanner() {
  const { userProfile, logout } = useAuth();
  const [leaving, setLeaving] = useState(false);

  if (!userProfile?.isDemo) return null;

  // A signed-in user can't reach /signup (middleware bounces auth routes),
  // so leaving the demo means signing out first, then a hard navigation.
  const handleCreateAccount = async () => {
    if (leaving) return;
    setLeaving(true);
    try {
      await logout();
    } finally {
      window.location.assign("/signup");
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-accent/15 border-b border-accent/30 px-4 py-1.5 text-xs text-accent-light">
      <Info size={13} aria-hidden />
      <span>
        You&apos;re exploring the shared demo account. Changes are visible to
        other visitors and reset every few hours.
      </span>
      <button
        type="button"
        onClick={handleCreateAccount}
        disabled={leaving}
        className="font-semibold underline underline-offset-2 hover:text-white disabled:opacity-60 transition-colors"
      >
        {leaving ? "Signing you out…" : "Create your free account"}
      </button>
    </div>
  );
}
