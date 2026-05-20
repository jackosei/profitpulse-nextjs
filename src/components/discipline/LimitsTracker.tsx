"use client";

import { useMemo, useState } from "react";
import type { Pulse } from "@/types/pulse";
import { AlertCircle, RefreshCw, ChevronDown, ChevronRight, ShieldCheck } from "lucide-react";

interface LimitsTrackerProps {
  pulse: Pulse;
  /** Default collapsed state. Defaults to `true` (start collapsed). */
  defaultExpanded?: boolean;
}

export default function LimitsTracker({ pulse, defaultExpanded = false }: LimitsTrackerProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const { metrics, hasLimits } = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    
    // Daily Drawdown
    const dailyLossLimit = (pulse.maxDailyDrawdown / 100) * pulse.accountSize;
    const dailyLossSoFar = pulse.dailyLoss?.[todayStr] || 0;
    const dailyLossPct = dailyLossLimit > 0 ? (dailyLossSoFar / dailyLossLimit) * 100 : 0;
    
    // Total Drawdown
    const totalLossLimit = (pulse.maxTotalDrawdown / 100) * pulse.accountSize;
    const totalDrawdownSoFar = pulse.totalDrawdown || 0;
    const totalDrawdownPct = totalLossLimit > 0 ? (totalDrawdownSoFar / totalLossLimit) * 100 : 0;
    
    // Max Trades Per Day
    const maxTrades = pulse.discipline?.maxTradesPerDay || null;
    const todayTradesCount = pulse.trades?.filter(t => t.date === todayStr).length || 0;
    const tradesPct = maxTrades && maxTrades > 0 ? (todayTradesCount / maxTrades) * 100 : 0;

    return {
      metrics: {
        daily: {
          current: dailyLossSoFar,
          limit: dailyLossLimit,
          pct: Math.min(100, dailyLossPct),
          label: `Daily Drawdown (${pulse.maxDailyDrawdown}%)`
        },
        total: {
          current: totalDrawdownSoFar,
          limit: totalLossLimit,
          pct: Math.min(100, totalDrawdownPct),
          label: `Total Drawdown (${pulse.maxTotalDrawdown}%)`
        },
        trades: maxTrades ? {
          current: todayTradesCount,
          limit: maxTrades,
          pct: Math.min(100, tradesPct),
          label: `Daily Trade Limit`
        } : null
      },
      hasLimits: pulse.maxDailyDrawdown > 0 || pulse.maxTotalDrawdown > 0 || maxTrades !== null
    };
  }, [pulse]);

  if (!hasLimits) return null;

  // Summary signal for collapsed state
  const worstPct = Math.max(metrics.daily.pct, metrics.total.pct, metrics.trades?.pct ?? 0);
  const summary = worstPct >= 100
    ? { tone: "danger" as const, label: "Limit exceeded" }
    : worstPct >= 75
      ? { tone: "warn" as const, label: "Approaching limit" }
      : { tone: "ok" as const, label: "All limits OK" };
  const summaryColor = summary.tone === "danger" ? "text-red-400" : summary.tone === "warn" ? "text-amber-400" : "text-emerald-400";
  const summaryBg = summary.tone === "danger" ? "bg-red-500/10" : summary.tone === "warn" ? "bg-amber-500/10" : "bg-emerald-500/10";

  return (
    <div className="bg-dark/40 border border-gray-800/60 rounded-lg overflow-hidden">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {expanded
            ? <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
            : <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
          }
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 m-0">
            Real-Time Risk Limits
          </h3>
          {!expanded && (
            <span className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${summaryColor} ${summaryBg}`}>
              {summary.tone === "ok" ? <ShieldCheck className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              {summary.label}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!expanded && (
            <span className="hidden sm:inline text-[11px] text-gray-500 tabular-nums">
              Daily {metrics.daily.pct.toFixed(0)}%
              <span className="text-gray-700 mx-1.5">·</span>
              Total {metrics.total.pct.toFixed(0)}%
              {metrics.trades && <>
                <span className="text-gray-700 mx-1.5">·</span>
                Trades {metrics.trades.current}/{metrics.trades.limit}
              </>}
            </span>
          )}
          {pulse.discipline?.activeConstraints?.cleanSessionsToLift ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-medium">
              <AlertCircle className="w-3 h-3" />
              {pulse.discipline.activeConstraints.cleanSessionsToLift} clean to lift
            </span>
          ) : null}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && <div className="px-4 pb-4 pt-1 border-t border-gray-800/60">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-3">
        <ProgressBarMetric 
          label={metrics.daily.label}
          current={`$${metrics.daily.current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          limit={`$${metrics.daily.limit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          pct={metrics.daily.pct}
          isWarning={metrics.daily.pct >= 75}
          isDanger={metrics.daily.pct >= 100}
        />
        
        <ProgressBarMetric 
          label={metrics.total.label}
          current={`$${metrics.total.current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          limit={`$${metrics.total.limit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          pct={metrics.total.pct}
          isWarning={metrics.total.pct >= 75}
          isDanger={metrics.total.pct >= 100}
        />

        {metrics.trades && (
          <ProgressBarMetric
            label={metrics.trades.label}
            current={metrics.trades.current.toString()}
            limit={metrics.trades.limit.toString()}
            pct={metrics.trades.pct}
            isWarning={metrics.trades.pct >= 75}
            isDanger={metrics.trades.pct >= 100}
          />
        )}
      </div>

      {/* Weekly breach counts */}
      {pulse.discipline?.weeklyBreachCounts && (() => {
        const wbc = pulse.discipline!.weeklyBreachCounts;
        const hasAny = wbc.riskPerTrade > 0 || wbc.drawdownDaily > 0 || wbc.overtrading > 0;
        if (!hasAny) return null;
        return (
          <div className="mt-4 pt-4 border-t border-gray-800/60">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                This Week&apos;s Breaches
              </span>
              <span className="flex items-center gap-1 text-[10px] text-gray-600">
                <RefreshCw className="w-3 h-3" />
                Resets Monday
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {wbc.riskPerTrade > 0 && (
                <BreachBadge label="Risk" count={wbc.riskPerTrade} warnAt={2} dangerAt={4} />
              )}
              {wbc.drawdownDaily > 0 && (
                <BreachBadge label="Daily DD" count={wbc.drawdownDaily} warnAt={1} dangerAt={2} />
              )}
              {wbc.overtrading > 0 && (
                <BreachBadge label="Overtrading" count={wbc.overtrading} warnAt={1} dangerAt={2} />
              )}
            </div>
          </div>
        );
      })()}
      </div>}
    </div>
  );
}

function BreachBadge({ label, count, warnAt, dangerAt }: { label: string; count: number; warnAt: number; dangerAt: number }) {
  const isDanger = count >= dangerAt;
  const isWarn = !isDanger && count >= warnAt;
  const color = isDanger
    ? "text-red-400 bg-red-500/10 border-red-500/20"
    : isWarn
      ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
      : "text-gray-400 bg-gray-700/30 border-gray-700/40";
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded border ${color}`}
      title={`${count} ${label.toLowerCase()} breach${count !== 1 ? "es" : ""} this week`}
    >
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-600">·</span>
      <span className="font-bold tabular-nums">{count}</span>
    </span>
  );
}

function ProgressBarMetric({
  label, current, limit, pct, isWarning, isDanger
}: {
  label: string; current: string; limit: string; pct: number; isWarning: boolean; isDanger: boolean;
}) {
  const barColor = isDanger ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-emerald-500";
  const textColor = isDanger ? "text-red-400" : isWarning ? "text-amber-400" : "text-gray-300";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-end justify-between">
        <span className="text-xs font-medium text-gray-400">{label}</span>
        <div className="flex items-baseline gap-1 text-xs">
          <span className={`font-semibold ${textColor}`}>{current}</span>
          <span className="text-gray-500">/ {limit}</span>
        </div>
      </div>
      
      <div className="h-2 w-full bg-gray-800/80 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {(isWarning || isDanger) && (
        <p className={`text-[10px] mt-0.5 flex items-center gap-1 ${isDanger ? "text-red-400" : "text-amber-400"}`}>
          <AlertCircle className="w-3 h-3" />
          {isDanger ? "Limit exceeded" : "Approaching limit"}
        </p>
      )}
    </div>
  );
}
