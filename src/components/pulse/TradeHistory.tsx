import { Trade } from '@/types/pulse';
import { useRef, useEffect } from 'react';

interface TradeHistoryProps {
  trades: Trade[];
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onAddTrade: () => void;
}

export default function TradeHistory({
  trades,
  hasMore,
  loadingMore,
  onLoadMore,
  onAddTrade,
}: TradeHistoryProps) {
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, onLoadMore]);

  return (
    <div className="bg-dark rounded-lg border border-gray-800">
      <div className="p-3 md:p-4 border-b border-gray-800">
        <div className="flex justify-between items-center">
          <h2 className="text-base md:text-lg font-semibold text-foreground">Trade History</h2>
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
              <th className="p-3 md:p-4 text-left text-xs md:text-sm text-gray-400">Date</th>
              <th className="p-3 md:p-4 text-left text-xs md:text-sm text-gray-400">Type</th>
              <th className="p-3 md:p-4 text-left text-xs md:text-sm text-gray-400 hidden md:table-cell">Lot Size</th>
              <th className="p-3 md:p-4 text-left text-xs md:text-sm text-gray-400 hidden md:table-cell">Entry Reason</th>
              <th className="p-3 md:p-4 text-left text-xs md:text-sm text-gray-400">Outcome</th>
              <th className="p-3 md:p-4 text-right text-xs md:text-sm text-gray-400">P/L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {trades?.map((trade) => (
              <tr key={trade.id} className="hover:bg-gray-800/50">
                <td className="p-3 md:p-4 text-sm md:text-base text-foreground">{trade.date}</td>
                <td className="p-3 md:p-4 text-sm md:text-base text-foreground">{trade.type}</td>
                <td className="p-3 md:p-4 text-sm md:text-base text-foreground hidden md:table-cell">{trade.lotSize}</td>
                <td className="p-3 md:p-4 text-sm md:text-base text-foreground hidden md:table-cell">{trade.entryReason}</td>
                <td className="p-3 md:p-4 text-sm md:text-base text-foreground">{trade.outcome}</td>
                <td className="p-3 md:p-4 text-sm md:text-base text-right text-foreground">
                  ${trade.profitLoss.toFixed(2)}
                </td>
              </tr>
            ))}
            {(!trades || trades.length === 0) && (
              <tr>
                <td colSpan={6} className="p-3 md:p-4 text-center text-sm text-gray-400">
                  No trades recorded yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div 
          ref={observerTarget}
          className="p-4 text-center text-gray-400"
        >
          {loadingMore ? "Loading more trades..." : "Scroll for more"}
        </div>
      )}
    </div>
  );
} 