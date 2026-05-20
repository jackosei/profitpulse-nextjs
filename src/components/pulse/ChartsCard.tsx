"use client";

import { useState } from "react";
import PulseChart from "@/components/pulse/PulseChart";
import DisciplineChart from "@/components/discipline/DisciplineChart";
import type { Trade } from "@/types/pulse";
import { TrendingUp, Shield } from "lucide-react";

type TimeRange = "7D" | "30D" | "90D" | "1Y" | "ALL";
type Tab = "equity" | "discipline";

interface ChartsCardProps {
  pulseId: string;
  trades: Trade[];
  timeRange: TimeRange;
}

export default function ChartsCard({ pulseId, trades, timeRange }: ChartsCardProps) {
  const [tab, setTab] = useState<Tab>("equity");

  return (
    <div className="bg-dark rounded-lg border border-gray-800 overflow-hidden">
      <div className="px-2 border-b border-gray-800/60 flex items-center gap-1">
        <TabButton active={tab === "equity"} onClick={() => setTab("equity")} icon={<TrendingUp className="w-3.5 h-3.5" />}>
          Equity Curve
        </TabButton>
        <TabButton active={tab === "discipline"} onClick={() => setTab("discipline")} icon={<Shield className="w-3.5 h-3.5" />}>
          Discipline Score
        </TabButton>
      </div>

      <div className="p-3 md:p-4">
        {tab === "equity" && (
          <div className="h-[260px] md:h-[300px]">
            {trades.length > 0 ? (
              <PulseChart trades={trades} timeRange={timeRange} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-gray-600">
                <span className="text-3xl">📈</span>
                <p className="text-sm">No trades yet — log your first trade to see the curve</p>
              </div>
            )}
          </div>
        )}
        {tab === "discipline" && <DisciplineChart pulseId={pulseId} />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex items-center gap-1.5 px-3 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
        active ? "text-blue-400" : "text-gray-500 hover:text-gray-300"
      }`}
    >
      {icon}
      {children}
      {active && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />}
    </button>
  );
}
