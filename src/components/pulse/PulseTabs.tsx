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

export default function PulseTabs({ active, onChange, badges }: PulseTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Pulse view"
      className="bg-dark border border-gray-800 rounded-lg px-1 py-1 flex items-center gap-1 overflow-x-auto"
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
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors shrink-0 ${
              isActive
                ? "bg-blue-500/15 text-blue-300"
                : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {badge !== undefined && badge !== 0 && (
              <span
                className={`ml-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold ${
                  isActive ? "bg-blue-400/30 text-blue-200" : "bg-amber-500/20 text-amber-300"
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
