"use client";

import { Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/react";
import { CalendarIcon, ChevronDownIcon, ArrowsRightLeftIcon } from "@heroicons/react/24/outline";

type TimeRange = "7D" | "30D" | "90D" | "1Y" | "ALL";
type ComparisonType = "PERIOD" | "START";

const TIME_RANGES = [
  { label: "Last 7 Days", value: "7D" },
  { label: "Last 30 Days", value: "30D" },
  { label: "Last Quarter", value: "90D" },
  { label: "Last Year", value: "1Y" },
  { label: "All Time", value: "ALL" },
] as const;

interface PerformanceControlsProps {
  selectedTimeRange: TimeRange;
  comparisonType: ComparisonType;
  onTimeRangeChange: (range: TimeRange) => void;
  onComparisonTypeChange: () => void;
}

export default function PerformanceControls({
  selectedTimeRange,
  comparisonType,
  onTimeRangeChange,
  onComparisonTypeChange,
}: PerformanceControlsProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Time range */}
      <Menu as="div" className="relative">
        <MenuButton className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-300 bg-dark border border-gray-800 hover:border-gray-700 rounded-lg transition-colors">
          <CalendarIcon className="w-3.5 h-3.5 text-gray-500" />
          <span>{TIME_RANGES.find((r) => r.value === selectedTimeRange)?.label}</span>
          <ChevronDownIcon className="w-3.5 h-3.5 text-gray-500" />
        </MenuButton>
        <MenuItems className="absolute left-0 mt-1 w-44 bg-dark-lighter border border-gray-700/60 rounded-xl shadow-2xl overflow-hidden z-40 py-1">
          {TIME_RANGES.map((range) => (
            <MenuItem key={range.value}>
              {({ active }) => (
                <button
                  onClick={() => onTimeRangeChange(range.value)}
                  className={`${active ? "bg-white/5" : ""} ${
                    selectedTimeRange === range.value ? "text-blue-400 font-medium" : "text-gray-300"
                  } flex items-center justify-between w-full px-3 py-2 text-xs`}
                >
                  {range.label}
                  {selectedTimeRange === range.value && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                </button>
              )}
            </MenuItem>
          ))}
        </MenuItems>
      </Menu>

      {/* Comparison toggle */}
      <button
        onClick={onComparisonTypeChange}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
          comparisonType === "PERIOD"
            ? "text-blue-400 bg-blue-500/10 border-blue-500/30"
            : "text-gray-400 bg-dark border-gray-800 hover:border-gray-700"
        }`}
        title={comparisonType === "PERIOD" ? "Comparing to previous period" : "Comparing to starting stats"}
      >
        <ArrowsRightLeftIcon className="w-3.5 h-3.5" />
        {comparisonType === "PERIOD" ? "vs Previous Period" : "vs Start"}
      </button>
    </div>
  );
}
