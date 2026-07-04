"use client";

import { useMemo } from "react";
import type { Pulse } from "@/types/pulse";
import { getZone } from "@/lib/disciplineEngine";
import type { DisciplineZone } from "@/lib/disciplineTypes";
import { formatCurrency } from "@/utils/format";
import { Flame, ShieldAlert, ArrowRight } from "lucide-react";

interface PulseVitalsProps {
  pulse: Pulse;
  /** Called when the user clicks the active constraints chip — should switch to Discipline tab */
  onJumpToDiscipline: () => void;
}

// ---------------------------------------------------------------------------
// Zone styles (kept inline; small and only used here)
// ---------------------------------------------------------------------------

const ZONE_STYLE: Record<
  DisciplineZone,
  { label: string; text: string; bg: string; border: string; dot: string }
> = {
  GREEN: { label: "Stable", text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25", dot: "bg-emerald-400" },
  YELLOW: { label: "At Risk", text: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/25", dot: "bg-yellow-400" },
  RED: { label: "Enforcement", text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/25", dot: "bg-red-400" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PulseVitals({ pulse, onJumpToDiscipline }: PulseVitalsProps) {
  const d = pulse.discipline;
  const score = d?.disciplineScore ?? 100;
  const zone = getZone(score);
  const zoneStyle = ZONE_STYLE[zone];

  const todayStr = new Date().toISOString().split("T")[0];

  // Today's metrics derived from loaded trades
  const { todayPL, todayCount } = useMemo(() => {
    const todays = (pulse.trades ?? []).filter((t) => t.date === todayStr);
    const pl = todays.reduce((sum, t) => sum + (t.performance?.profitLoss ?? 0), 0);
    return { todayPL: pl, todayCount: todays.length };
  }, [pulse.trades, todayStr]);

  const maxTradesPerDay = d?.maxTradesPerDay ?? null;
  const streak = d?.consecutiveCleanDays ?? 0;

  // Active constraints count
  const constraints = d?.activeConstraints;
  const activeCount = useMemo(() => {
    if (!constraints) return 0;
    let n = 0;
    if (constraints.riskCapPct !== null) n++;
    if (constraints.tradeCapCount !== null) n++;
    if (constraints.noTradeDays > 0) n++;
    if (constraints.lockoutUntil !== null) n++;
    return n;
  }, [constraints]);

  const plPositive = todayPL > 0;
  const plNegative = todayPL < 0;
  const plColor = plPositive ? "text-emerald-400" : plNegative ? "text-red-400" : "text-gray-300";

  return (
    <div className="bg-dark border border-gray-800 rounded-lg px-3 py-2.5 flex items-center gap-2 flex-wrap">
      {/* Zone + Score */}
      <VitalChip
        title={`Discipline score ${Math.round(score)}/100. Zone: ${zoneStyle.label}.`}
      >
        <span className={`w-2 h-2 rounded-full ${zoneStyle.dot} ${zone === "GREEN" ? "animate-pulse" : ""}`} />
        <span className={`text-xs font-semibold ${zoneStyle.text}`}>{zoneStyle.label}</span>
        <span className="text-xs text-gray-500">·</span>
        <span className="text-xs font-bold text-gray-100 tabular-nums">{Math.round(score)}</span>
        <span className="text-[10px] text-gray-500">/100</span>
      </VitalChip>

      <Divider />

      {/* Today's P/L */}
      <VitalChip title={`Today's profit/loss across ${todayCount} trade${todayCount !== 1 ? "s" : ""}.`}>
        <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Today</span>
        <span className={`text-xs font-bold tabular-nums ${plColor}`}>
          {plPositive ? "+" : ""}{formatCurrency(todayPL)}
        </span>
      </VitalChip>

      <Divider />

      {/* Today's trade count (vs cap if set) */}
      <VitalChip
        title={
          maxTradesPerDay
            ? `${todayCount} of ${maxTradesPerDay} daily trades used.`
            : `${todayCount} trade${todayCount !== 1 ? "s" : ""} logged today.`
        }
      >
        <span className="text-xs font-medium text-gray-300 tabular-nums">
          {todayCount}{maxTradesPerDay !== null ? `/${maxTradesPerDay}` : ""}
        </span>
        <span className="text-[10px] text-gray-500">{todayCount === 1 ? "trade" : "trades"}</span>
      </VitalChip>

      {/* Streak — only if > 0 */}
      {streak > 0 && (
        <>
          <Divider />
          <VitalChip title={`${streak} consecutive clean day${streak !== 1 ? "s" : ""}.`}>
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-xs font-bold tabular-nums text-orange-300">{streak}</span>
            <span className="text-[10px] text-gray-500">day streak</span>
          </VitalChip>
        </>
      )}

      {/* Active constraints — only if any */}
      {activeCount > 0 && (
        <>
          <div className="flex-1" />
          <button
            type="button"
            onClick={onJumpToDiscipline}
            title="View active constraints on the Discipline tab"
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/25 hover:bg-amber-500/15 transition-colors"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{activeCount} active constraint{activeCount !== 1 ? "s" : ""}</span>
            <ArrowRight className="w-3 h-3 opacity-70" />
          </button>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function VitalChip({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-1 py-0.5 cursor-help"
      title={title}
    >
      {children}
    </span>
  );
}

function Divider() {
  return <span className="w-px h-4 bg-gray-700/60 hidden sm:inline-block" aria-hidden="true" />;
}
