"use client";

import { useMemo } from "react";
import type { Pulse } from "@/types/pulse";
import { AlertCircle } from "lucide-react";

interface LimitsTrackerProps {
  pulse: Pulse;
}

export default function LimitsTracker({ pulse }: LimitsTrackerProps) {
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

  return (
    <div className="bg-dark/40 border border-gray-800/60 rounded-lg p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-1.5">
        Real-Time Risk Limits
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
    </div>
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
