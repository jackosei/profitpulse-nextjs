"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronRight, AlertTriangle, Loader2 } from "lucide-react";
import type { ViolationLogEntry } from "@/lib/disciplineTypes";
import { ViolationCategory, ViolationType } from "@/lib/disciplineTypes";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ViolationHistoryPanelProps {
  pulseId: string;
}

interface ViolationEntry extends Omit<ViolationLogEntry, "timestamp"> {
  id: string;
  timestamp: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VIOLATION_LABELS: Record<ViolationType, string> = {
  [ViolationType.RISK_PER_TRADE]: "Risk Per Trade",
  [ViolationType.DAILY_DRAWDOWN]: "Daily Drawdown",
  [ViolationType.TOTAL_DRAWDOWN]: "Total Drawdown",
  [ViolationType.MAX_TRADES_PER_DAY]: "Max Trades/Day",
  [ViolationType.REQUIRED_RULE_MISSED]: "Required Rule Missed",
  [ViolationType.OPTIONAL_RULE_MISSED]: "Optional Rule Missed",
  [ViolationType.MULTI_REQUIRED_RULE_MISS]: "Multi-Rule Miss",
  [ViolationType.NO_TRADE_DAY_VIOLATED]: "No-Trade Day Violated",
};

function categoryBadge(category: ViolationCategory) {
  return category === ViolationCategory.QUANTITATIVE
    ? { label: "Risk", color: "text-red-400 bg-red-500/10 border-red-500/20" }
    : { label: "Rules", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
}

function formatDate(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr ?? "Unknown date";
  const [y, m, d] = dateStr.split("-");
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ViolationHistoryPanel({ pulseId }: ViolationHistoryPanelProps) {
  const [entries, setEntries] = useState<ViolationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [limit, setLimit] = useState(50);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  const fetchViolations = useCallback(async (fetchLimit: number, isLoadMore = false) => {
    if (!isLoadMore) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    try {
      const { getFirebaseToken } = await import("@/services/firebase/authService");
      const token = await getFirebaseToken();
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(
        `/api/discipline/violations?pulseId=${encodeURIComponent(pulseId)}&limit=${fetchLimit}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error("Failed to load violation history");
      const json = await res.json();
      const data: ViolationEntry[] = json.data ?? [];
      // Filter out entries missing required fields (legacy Phase 1 documents)
      const valid = data.filter(
        (e) => e.sessionDate && /^\d{4}-\d{2}-\d{2}$/.test(e.sessionDate) && e.violation?.severity !== undefined,
      );
      setEntries(valid);
      setHasMore(data.length === fetchLimit);
      // Auto-expand the most recent day
      if (!isLoadMore && valid.length > 0) {
        setExpandedDays(new Set([valid[0].sessionDate]));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [pulseId]);

  useEffect(() => {
    fetchViolations(limit);
  }, [fetchViolations, limit]);

  const handleLoadMore = () => {
    const newLimit = limit + 50;
    setLimit(newLimit);
    fetchViolations(newLimit, true);
  };

  const toggleDay = (date: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      next.has(date) ? next.delete(date) : next.add(date);
      return next;
    });
  };

  // Group entries by sessionDate
  const grouped = entries.reduce<Record<string, ViolationEntry[]>>((acc, entry) => {
    (acc[entry.sessionDate] ??= []).push(entry);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-500 gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading violation history…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
        {error}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-gray-800 bg-[#0f0f0f] px-5 py-8 text-center">
        <AlertTriangle className="w-8 h-8 text-gray-600 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No violations recorded — keep it clean.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {dates.map((date) => {
        const dayEntries = grouped[date];
        const isExpanded = expandedDays.has(date);
        const totalPenalty = dayEntries.reduce((s, e) => s + (e.violation?.severity ?? 0), 0);

        return (
          <div key={date} className="rounded-lg border border-gray-800 bg-[#0f0f0f] overflow-hidden">
            {/* Day header — collapsible */}
            <button
              type="button"
              onClick={() => toggleDay(date)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/30 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5">
                {isExpanded
                  ? <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                  : <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
                }
                <span className="text-sm font-medium text-gray-200">{formatDate(date)}</span>
                <span className="text-xs text-gray-500">{dayEntries.length} violation{dayEntries.length !== 1 ? "s" : ""}</span>
              </div>
              <span className="text-xs font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                −{totalPenalty} pts
              </span>
            </button>

            {/* Day entries */}
            {isExpanded && (
              <div className="border-t border-gray-800/60 divide-y divide-gray-800/40">
                {dayEntries.map((entry) => {
                  const violation = entry.violation;
                  if (!violation) return null;
                  const badge = categoryBadge(violation.category);
                  const scoreDelta = entry.scoreAfter - entry.scoreBefore;
                  return (
                    <div key={entry.id} className="px-4 py-3 flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-semibold uppercase tracking-wider border rounded px-1.5 py-0.5 ${badge.color}`}>
                            {badge.label}
                          </span>
                          <span className="text-xs font-medium text-gray-200">
                            {VIOLATION_LABELS[violation.type] ?? violation.type}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">{violation.details}</p>
                        <p className="text-[10px] text-gray-600">
                          Score: <span className="text-gray-400">{entry.scoreBefore}</span>
                          {" → "}
                          <span className="text-gray-400">{entry.scoreAfter}</span>
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-sm font-bold text-red-400">
                          {scoreDelta < 0 ? `−${Math.abs(scoreDelta)}` : `+${scoreDelta}`} pts
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {hasMore && (
        <button
          type="button"
          onClick={handleLoadMore}
          disabled={loadingMore}
          className="w-full py-2.5 text-sm text-gray-500 hover:text-gray-300 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
        >
          {loadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {loadingMore ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
