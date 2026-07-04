"use client";

import { Flame } from "lucide-react";

interface StreakBadgeProps {
  consecutiveCleanDays: number;
}

export default function StreakBadge({ consecutiveCleanDays }: StreakBadgeProps) {
  if (consecutiveCleanDays < 1) return null;

  const isHot = consecutiveCleanDays >= 3;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark/50 border border-gray-800">
      <div
        className={`flex items-center justify-center w-6 h-6 rounded-full ${
          isHot ? "bg-amber-500/20" : "bg-blue-500/20"
        }`}
      >
        <Flame
          className={`w-3.5 h-3.5 ${
            isHot ? "text-amber-500" : "text-blue-400"
          }`}
        />
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold leading-none">
          Clean Streak
        </span>
        <span
          className={`text-sm font-bold leading-tight ${
            isHot ? "text-amber-500" : "text-blue-400"
          }`}
        >
          {consecutiveCleanDays} {consecutiveCleanDays === 1 ? "day" : "days"}
        </span>
      </div>
    </div>
  );
}
