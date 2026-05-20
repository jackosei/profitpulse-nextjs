"use client";

import { useState, useEffect } from "react";
import { X, Heart } from "lucide-react";
import type { DisciplineZone } from "@/lib/disciplineTypes";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface WHYReminderBannerProps {
  pulseId: string;
  whyStatement: string;
  whyDiscipline: string;
  zone: DisciplineZone;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDismissKey(pulseId: string): string {
  return `why-reminder-dismissed-${pulseId}-${new Date().toISOString().split("T")[0]}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WHYReminderBanner({
  pulseId,
  whyStatement,
  whyDiscipline,
  zone,
}: WHYReminderBannerProps) {
  const [dismissed, setDismissed] = useState(true); // start hidden, check on mount

  useEffect(() => {
    // Check if already dismissed this session/day
    const key = getDismissKey(pulseId);
    const alreadyDismissed = sessionStorage.getItem(key) === "true";
    setDismissed(alreadyDismissed);
  }, [pulseId]);

  // Only show when zone is not GREEN and WHY fields are populated
  if (zone === "GREEN" || !whyStatement || dismissed) return null;

  const handleDismiss = () => {
    const key = getDismissKey(pulseId);
    sessionStorage.setItem(key, "true");
    setDismissed(true);
  };

  const isRed = zone === "RED";
  const borderColor = isRed ? "border-red-500/40" : "border-yellow-500/40";
  const bgColor = isRed ? "bg-red-500/10" : "bg-yellow-500/10";
  const iconColor = isRed ? "text-red-400" : "text-yellow-400";
  const headingColor = isRed ? "text-red-300" : "text-yellow-300";
  const zoneLabel = isRed ? "Enforcement" : "At Risk";
  const zoneBadge = isRed
    ? "bg-red-500/20 text-red-300 border-red-500/30"
    : "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";

  return (
    <div
      className={`relative rounded-lg border ${borderColor} ${bgColor} p-4 mb-2`}
      role="alert"
      aria-label="WHY Reminder"
    >
      {/* Dismiss button */}
      <button
        id={`why-reminder-dismiss-${pulseId}`}
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-gray-500 hover:text-gray-300 transition-colors"
        aria-label="Dismiss WHY reminder"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Header */}
      <div className="flex items-center gap-2 mb-3 pr-6">
        <Heart className={`w-4 h-4 ${iconColor} shrink-0`} />
        <span className={`text-xs font-semibold uppercase tracking-wider ${headingColor}`}>
          Remember why you started
        </span>
        <span className={`shrink-0 px-2 py-0.5 text-[10px] font-semibold rounded-full border ${zoneBadge}`}>
          {zoneLabel}
        </span>
      </div>

      {/* WHY fields */}
      <div className="space-y-2.5">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 font-semibold">
            Why I trade
          </p>
          <p className="text-sm text-gray-200 leading-relaxed italic">
            &ldquo;{whyStatement}&rdquo;
          </p>
        </div>

        {whyDiscipline && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 font-semibold">
              What following my rules means to me
            </p>
            <p className="text-sm text-gray-200 leading-relaxed italic">
              &ldquo;{whyDiscipline}&rdquo;
            </p>
          </div>
        )}
      </div>

      {/* Action nudge */}
      <p className="mt-3 text-[11px] text-gray-400 border-t border-white/5 pt-2.5">
        Log a clean session today — all required rules followed — to begin recovery (+8 pts).
      </p>
    </div>
  );
}
