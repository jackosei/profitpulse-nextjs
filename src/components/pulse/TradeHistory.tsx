import { Trade, Pulse, isPulseLocked, PULSE_MESSAGES } from "@/types/pulse";
import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import TradeDetailsModal from "@/components/modals/TradeDetailsModal";
import { TableIcon, CalendarIcon, Layers, ChevronDown, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/utils/format";

type ViewType = "by-day" | "table" | "calendar";

interface TradeHistoryProps {
  trades: Trade[];
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onAddTrade: () => void;
  onRefresh?: () => void; // Callback to refresh data after trade update
  pulse?: Pulse;
  viewType: ViewType;
  onViewTypeChange: (viewType: ViewType) => void;
}

export default function TradeHistory({
  trades,
  hasMore,
  loadingMore,
  onLoadMore,
  onAddTrade,
  onRefresh,
  pulse,
  viewType,
  onViewTypeChange,
}: TradeHistoryProps) {
  const observerTarget = useRef<HTMLDivElement>(null);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          onLoadMore();
        }
      },
      { threshold: 0.1 },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, onLoadMore]);

  const handleViewDetails = useCallback((trade: Trade, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedTrade(trade);
  }, []);

  const closeDetailsModal = useCallback(() => {
    setSelectedTrade(null);
  }, []);

  return (
    <div className="bg-dark rounded-lg border border-gray-800">
      <div className="p-3 md:p-4 border-b border-gray-800">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h2 className="text-base md:text-lg font-semibold text-foreground">
              Trade History
            </h2>

            {/* View Toggle */}
            <div className="bg-gray-800/80 rounded-md p-0.5 flex">
              <button
                type="button"
                onClick={() => onViewTypeChange("by-day")}
                className={`p-1.5 rounded-md ${viewType === "by-day"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white"
                  } transition-colors flex items-center`}
                title="By Day (grouped)"
              >
                <Layers className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onViewTypeChange("table")}
                className={`p-1.5 rounded-md ${viewType === "table"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white"
                  } transition-colors flex items-center`}
                title="Table View"
              >
                <TableIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onViewTypeChange("calendar")}
                className={`p-1.5 rounded-md ${viewType === "calendar"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white"
                  } transition-colors flex items-center`}
                title="Calendar View"
              >
                <CalendarIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
          <button
            className={`btn-primary text-sm md:text-base px-3 py-1.5 md:px-4 md:py-2 ${pulse && isPulseLocked(pulse) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            onClick={onAddTrade}
            disabled={pulse && isPulseLocked(pulse)}
            title={pulse && isPulseLocked(pulse) ? PULSE_MESSAGES.LOCKED_STATUS_TITLE : ''}
          >
            Add Trade
          </button>
        </div>
      </div>
      {viewType === "by-day" ? (
        <ByDayView trades={trades} onView={(t) => setSelectedTrade(t)} />
      ) : (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-800/50">
            <tr>
              <th className="p-3 md:p-4 text-left text-xs md:text-sm text-gray-400">
                Date
              </th>
              <th className="p-3 md:p-4 text-left text-xs md:text-sm text-gray-400">
                Type
              </th>
              <th className="p-3 md:p-4 text-left text-xs md:text-sm text-gray-400">
                Instrument
              </th>
              <th className="p-3 md:p-4 text-left text-xs md:text-sm text-gray-400 hidden md:table-cell">
                Lot Size
              </th>
              <th className="p-3 md:p-4 text-left text-xs md:text-sm text-gray-400 hidden lg:table-cell">
                Entry Reason
              </th>
              <th className="p-3 md:p-4 text-left text-xs md:text-sm text-gray-400">
                Outcome
              </th>
              <th className="p-3 md:p-4 text-right text-xs md:text-sm text-gray-400">
                P/L
              </th>
              <th className="p-3 md:p-4 text-center text-xs md:text-sm text-gray-400">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {trades?.map((trade) => (
              <tr key={trade.id} className="hover:bg-gray-800/50">
                <td className="p-3 md:p-4 text-sm md:text-base text-foreground">
                  {trade.date}
                </td>
                <td className="p-3 md:p-4 text-sm md:text-base text-foreground">
                  {trade.type}
                </td>
                <td className="p-3 md:p-4 text-sm md:text-base text-foreground">
                  {trade.instrument || "N/A"}
                </td>
                <td className="p-3 md:p-4 text-sm md:text-base text-foreground hidden md:table-cell">
                  {trade.execution.lotSize}
                </td>
                <td className="p-3 md:p-4 text-sm md:text-base text-foreground hidden lg:table-cell">
                  {trade.execution.entryReason.length > 30
                    ? `${trade.execution.entryReason.substring(0, 30)}...`
                    : trade.execution.entryReason}
                </td>
                <td className="p-3 md:p-4 text-sm md:text-base text-foreground">
                  {trade.outcome}
                </td>
                <td className="p-3 md:p-4 text-sm md:text-base text-right text-foreground">
                  ${trade.performance.profitLoss.toFixed(2)}
                </td>
                <td className="p-3 md:p-4 text-center">
                  <button
                    className="text-gray-400 hover:text-white"
                    onClick={(e) => handleViewDetails(trade, e)}
                    title="View Trade Details"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
            {(!trades || trades.length === 0) && (
              <tr>
                <td colSpan={8} className="p-0">
                  <div className="p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-200 mb-2">No trades recorded yet</h3>
                    <p className="text-gray-400 text-sm max-w-sm">
                      Log your first trade to start tracking performance and discipline metrics.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}

      {hasMore && viewType === "table" && (
        <div ref={observerTarget} className="p-4 text-center text-gray-400">
          {loadingMore ? "Loading more trades..." : "Scroll for more"}
        </div>
      )}

      {selectedTrade && (
        <TradeDetailsModal
          isOpen={!!selectedTrade}
          onClose={closeDetailsModal}
          trade={selectedTrade}
          pulse={pulse}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// By Day view — groups trades by their `date` field, sorts descending, and
// renders each day as a collapsible row with a summary (count, P/L, win rate).
// Auto-expands the most recent day on first render so the trader sees today's
// activity at a glance.
// ---------------------------------------------------------------------------

function formatDayHeader(dateStr: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const [y, m, d] = dateStr.split("-");
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ByDayView({ trades, onView }: { trades: Trade[]; onView: (t: Trade) => void }) {
  const grouped = useMemo(() => {
    const map = new Map<string, Trade[]>();
    for (const t of trades ?? []) {
      const key = t.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [trades]);

  // Default: expand the most recent day only
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    return grouped.length > 0 ? new Set([grouped[0][0]]) : new Set();
  });

  const toggle = (date: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  if (grouped.length === 0) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-200 mb-2">No trades recorded yet</h3>
        <p className="text-gray-400 text-sm max-w-sm">
          Log your first trade to start tracking performance and discipline metrics.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-800">
      {grouped.map(([date, dayTrades]) => {
        const isExpanded = expanded.has(date);
        const totalPL = dayTrades.reduce((sum, t) => sum + (t.performance?.profitLoss ?? 0), 0);
        const wins = dayTrades.filter((t) => t.outcome === "Win").length;
        const winRate = dayTrades.length > 0 ? Math.round((wins / dayTrades.length) * 100) : 0;
        const plClass = totalPL > 0 ? "text-emerald-400" : totalPL < 0 ? "text-red-400" : "text-gray-300";

        return (
          <div key={date}>
            {/* Day header */}
            <button
              type="button"
              onClick={() => toggle(date)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-800/30 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {isExpanded
                  ? <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                  : <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
                }
                <span className="text-sm font-semibold text-gray-200">{formatDayHeader(date)}</span>
                <span className="text-xs text-gray-500">{dayTrades.length} trade{dayTrades.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[11px] text-gray-500 tabular-nums hidden sm:inline">{winRate}% win</span>
                <span className={`text-sm font-bold tabular-nums ${plClass}`}>
                  {totalPL > 0 ? "+" : ""}{formatCurrency(totalPL)}
                </span>
              </div>
            </button>

            {/* Trade rows */}
            {isExpanded && (
              <div className="bg-dark/30">
                {dayTrades.map((trade) => {
                  const pl = trade.performance?.profitLoss ?? 0;
                  const plRowClass = pl > 0 ? "text-emerald-400" : pl < 0 ? "text-red-400" : "text-gray-300";
                  return (
                    <button
                      key={trade.id}
                      type="button"
                      onClick={() => onView(trade)}
                      className="w-full flex items-center justify-between gap-3 px-4 pl-10 py-2.5 hover:bg-gray-800/40 transition-colors text-left border-t border-gray-800/40"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${
                            trade.type === "Buy"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-red-500/10 text-red-400 border border-red-500/20"
                          }`}
                        >
                          {trade.type}
                        </span>
                        <span className="text-sm font-medium text-gray-200 shrink-0">{trade.instrument || "—"}</span>
                        <span className="text-xs text-gray-500 truncate hidden md:inline">
                          {trade.execution?.entryReason || ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[11px] text-gray-500">{trade.execution?.entryTime || ""}</span>
                        <span className={`text-sm font-semibold tabular-nums w-20 text-right ${plRowClass}`}>
                          {pl > 0 ? "+" : ""}{formatCurrency(pl)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
