import { memo, useCallback } from "react"
import { Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/react"
import { CalendarIcon, ChevronDownIcon } from "@heroicons/react/24/outline"

export type TimeRange = "7D" | "30D" | "90D" | "1Y" | "ALL"

export const TIME_RANGES = [
	{ label: "Last 7 Days", value: "7D" },
	{ label: "Last 30 Days", value: "30D" },
	{ label: "Last Quarter", value: "90D" },
	{ label: "Last Year", value: "1Y" },
	{ label: "All Time", value: "ALL" },
] as const

interface TimeRangeSelectorProps {
	selectedTimeRange: TimeRange
	onTimeRangeChange: (range: TimeRange) => void
}

function TimeRangeSelector({
	selectedTimeRange,
	onTimeRangeChange,
}: TimeRangeSelectorProps) {
	const handleRangeChange = useCallback(
		(range: TimeRange) => {
			onTimeRangeChange(range)
		},
		[onTimeRangeChange]
	)

	return (
		<Menu as="div" className="relative">
			<MenuButton className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white bg-dark border border-gray-800 rounded-lg transition-colors">
				<CalendarIcon className="w-4 h-4" />
				<span>
					{TIME_RANGES.find((r) => r.value === selectedTimeRange)?.label}
				</span>
				<ChevronDownIcon className="w-4 h-4 opacity-50" />
			</MenuButton>
			<MenuItems className="absolute right-0 mt-1 w-48 bg-dark border border-gray-800 rounded-lg shadow-lg overflow-hidden z-50">
				{TIME_RANGES.map((range) => (
					<MenuItem key={range.value}>
						{({ active }) => (
							<button
								onClick={() => handleRangeChange(range.value)}
								className={`${active ? "bg-white/5" : ""} ${
									selectedTimeRange === range.value
										? "text-accent"
										: "text-gray-300"
								} flex items-center w-full px-4 py-2 text-sm`}
							>
								{range.label}
							</button>
						)}
					</MenuItem>
				))}
			</MenuItems>
		</Menu>
	)
}

export default memo(TimeRangeSelector)
