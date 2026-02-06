import { Trade, Pulse } from "@/types/pulse";
import { useRef, useEffect, useState, useCallback } from "react";
import TradeDetailsModal from "@/components/modals/TradeDetailsModal";
import { TableIcon, CalendarIcon } from "lucide-react";

type ViewType = "table" | "calendar";

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
                onClick={() => onViewTypeChange("table")}
                className={`p-1.5 rounded-md ${
                  viewType === "table"
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white"
                } transition-colors flex items-center`}
                title="Table View"
              >
                <TableIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => onViewTypeChange("calendar")}
                className={`p-1.5 rounded-md ${
                  viewType === "calendar"
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
            className="btn-primary text-sm md:text-base px-3 py-1.5 md:px-4 md:py-2"
            onClick={onAddTrade}
          >
            Add Trade
          </button>
        </div>
      </div>
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
                <td
                  colSpan={8}
                  className="p-3 md:p-4 text-center text-sm text-gray-400"
                >
                  No trades recorded yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {hasMore && (
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
