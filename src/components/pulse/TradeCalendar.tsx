"use client";

import { useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isToday,
} from "date-fns";
import { Trade, Pulse } from "@/types/pulse";
import TradeDetailsModal from "@/components/modals/TradeDetailsModal";
import {
  ChevronLeft,
  ChevronRight,
  TableIcon,
  CalendarIcon,
} from "lucide-react";

type ViewType = "table" | "calendar";

interface TradeCalendarProps {
  trades: Trade[];
  pulse: Pulse;
  onAddTrade?: () => void;
  onRefresh?: () => void;
  viewType: ViewType;
  onViewTypeChange: (viewType: ViewType) => void;
}

export default function TradeCalendar({
  trades,
  pulse,
  onAddTrade,
  onRefresh,
  viewType,
  onViewTypeChange,
}: TradeCalendarProps) {
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Get the days for the current month
  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [currentMonth]);

  // Group trades by date for the current month view
  const tradesByDate = useMemo(() => {
    return trades.reduce<Record<string, Trade[]>>((acc, trade) => {
      const tradeDate = new Date(trade.date);
      if (
        tradeDate.getMonth() === currentMonth.getMonth() &&
        tradeDate.getFullYear() === currentMonth.getFullYear()
      ) {
        const dateKey = format(tradeDate, "yyyy-MM-dd");
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(trade);
      }
      return acc;
    }, {});
  }, [trades, currentMonth]);

  // Previous month
  const goToPreviousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
    );
  };

  // Next month
  const goToNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
    );
  };

  // Calculate total P&L for a day
  const getTotalPL = (dateKey: string): number => {
    if (!tradesByDate[dateKey]) return 0;
    return tradesByDate[dateKey].reduce(
      (total, trade) => total + trade.profitLoss,
      0,
    );
  };

  return (
    <div className="bg-dark rounded-lg border border-gray-800">
      <div className="p-3 md:p-4 border-b border-gray-800">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h2 className="text-base md:text-lg font-semibold">
              Trade Calendar
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

            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousMonth}
                className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="text-base font-medium">
                {format(currentMonth, "MMMM yyyy")}
              </h2>
              <button
                onClick={goToNextMonth}
                className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                title="Next Month"
              >
                <ChevronRight className="h-5 w-5" />
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

      <div className="p-4">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="text-center font-medium text-gray-400 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const dayTrades = tradesByDate[dateKey] || [];
            const totalPL = getTotalPL(dateKey);
            const hasWins = dayTrades.some((trade) => trade.outcome === "Win");
            const hasLosses = dayTrades.some(
              (trade) => trade.outcome === "Loss",
            );

            let borderColor = "border-gray-800";
            if (dayTrades.length > 0) {
              borderColor =
                totalPL > 0
                  ? "border-green-600"
                  : totalPL < 0
                    ? "border-red-600"
                    : "border-gray-800";
            }

            return (
              <div
                key={i}
                className={`min-h-[80px] p-1 rounded border ${borderColor} ${
                  isToday(day) ? "bg-gray-800/30" : "bg-gray-900/30"
                } hover:bg-gray-800/50 transition-colors cursor-pointer`}
                onClick={() =>
                  dayTrades.length > 0 && setSelectedTrade(dayTrades[0])
                }
              >
                <div className="text-right mb-1">
                  <span
                    className={`text-sm ${isToday(day) ? "font-bold" : ""}`}
                  >
                    {format(day, "d")}
                  </span>
                </div>

                {dayTrades.length > 0 && (
                  <div className="mt-1">
                    <div
                      className={`text-xs font-medium ${
                        totalPL > 0
                          ? "text-green-400"
                          : totalPL < 0
                            ? "text-red-400"
                            : "text-gray-300"
                      }`}
                    >
                      {totalPL > 0 ? "+" : ""}
                      {totalPL.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {dayTrades.length} trade
                      {dayTrades.length !== 1 ? "s" : ""}
                    </div>

                    <div className="flex gap-1 mt-1">
                      {hasWins && (
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      )}
                      {hasLosses && (
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selectedTrade && (
        <TradeDetailsModal
          isOpen={!!selectedTrade}
          trade={selectedTrade}
          onClose={() => setSelectedTrade(null)}
          pulse={pulse}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}
