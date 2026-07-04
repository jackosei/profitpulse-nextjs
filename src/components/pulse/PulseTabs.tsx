"use client";

import { TrendingUp, Shield, ListChecks } from "lucide-react";

export type PulseTab = "performance" | "discipline" | "trades";

interface PulseTabsProps {
  active: PulseTab;
  onChange: (tab: PulseTab) => void;
  /** Optional small badge per tab — e.g. constraint count on discipline */
  badges?: Partial<Record<PulseTab, number | string>>;
}

const TABS: { id: PulseTab; label: string; icon: React.ReactNode }[] = [
  { id: "performance", label: "Performance", icon: <TrendingUp className="w-3.5 h-3.5" /> },
  { id: "discipline", label: "Discipline", icon: <Shield className="w-3.5 h-3.5" /> },
  { id: "trades", label: "Trade Log", icon: <ListChecks className="w-3.5 h-3.5" /> },
];

/**
 * Tab strip designed to sit at the top of a card container. Renders no
 * outer background/border of its own — the parent provides the card chrome,
 * so the tabs and the panel below feel like one unified surface.
 *
 * Active tab uses an underline that overlaps the strip's bottom border
 * (the classic "tabs above content" pattern).
 */
export default function PulseTabs({ active, onChange, badges }: PulseTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Pulse view"
      className="flex items-center gap-0.5 overflow-x-auto"
    >
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        const badge = badges?.[tab.id];
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={`relative flex items-center gap-1.5 px-3 py-3 text-xs font-semibold transition-colors shrink-0 border-b-2 -mb-px ${
              isActive
                ? "text-blue-300 border-blue-400"
                : "text-gray-500 hover:text-gray-200 border-transparent"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {badge !== undefined && badge !== 0 && (
              <span
                className={`ml-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold ${
                  isActive ? "bg-blue-400/20 text-blue-200" : "bg-amber-500/20 text-amber-300"
                }`}
              >
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
