interface StatProps {
	current: number
	previous: number
	initial: number
	comparisonType: "PERIOD" | "START"
	format?: (value: number) => string
	isTradeCount?: boolean
}

function StatChange({
	current,
	previous,
	initial,
	comparisonType,
	format,
	isTradeCount,
}: StatProps) {
	const compareValue = comparisonType === "PERIOD" ? previous : initial
	const diff = current - compareValue
	const percentChange =
		compareValue !== 0 ? (diff / Math.abs(compareValue)) * 100 : 0

	const isEqual = Math.abs(diff) < 0.01

	let color = "text-blue-500"
	if (!isEqual) {
		if (isTradeCount) {
			color = diff > 0 ? "text-blue-500" : "text-gray-500"
		} else {
			color = diff > 0 ? "text-green-500" : "text-red-500"
		}
	}

	return (
		<div
			className={`absolute top-3 right-3 flex items-center space-x-1 ${color}`}
		>
			<span className="text-xs">
				{isEqual
					? "0%"
					: `${format ? format(percentChange) : percentChange.toFixed(1)}%`}
			</span>
			<span className="text-lg">{isEqual ? "•" : diff > 0 ? "↑" : "↓"}</span>
		</div>
	)
}

interface PulseStatsProps {
	stats: {
		winRate: { current: number; previous: number; initial: number }
		totalPL: { current: number; previous: number; initial: number }
		plPercentage: { current: number; previous: number; initial: number }
		trades: { current: number; previous: number; initial: number }
		profitFactor?: { current: number; previous: number; initial: number }
	}
	comparisonType: "PERIOD" | "START"
}

export default function PulseStats({ stats, comparisonType }: PulseStatsProps) {
	return (
		<div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
			<div className="bg-dark p-3 md:p-4 rounded-lg border border-gray-800 relative">
				<h3 className="text-gray-400 text-xs md:text-sm">Win Rate</h3>
				<p className="text-lg md:text-2xl font-bold text-foreground mt-1">
					{stats.winRate.current.toFixed(1)}%
				</p>
				{stats.winRate[comparisonType === "PERIOD" ? "previous" : "initial"] >
					0 && (
					<StatChange {...stats.winRate} comparisonType={comparisonType} />
				)}
			</div>

			<div className="bg-dark p-3 md:p-4 rounded-lg border border-gray-800 relative">
				<h3 className="text-gray-400 text-xs md:text-sm">Profit/Loss</h3>
				<p className="text-lg md:text-2xl font-bold text-foreground mt-1">
					${stats.totalPL.current.toFixed(2)}{" "}
					<span className="text-sm text-gray-400">
						({stats.plPercentage.current.toFixed(2)}%)
					</span>
				</p>
				{stats.totalPL[comparisonType === "PERIOD" ? "previous" : "initial"] !==
					0 && (
					<StatChange
						{...stats.totalPL}
						comparisonType={comparisonType}
						format={(val) => val.toFixed(1)}
					/>
				)}
			</div>

			<div className="bg-dark p-3 md:p-4 rounded-lg border border-gray-800 relative">
				<h3 className="text-gray-400 text-xs md:text-sm">Profit Factor</h3>
				<p className="text-lg md:text-2xl font-bold text-foreground mt-1">
					{stats.profitFactor?.current.toFixed(2) || "0.00"}
				</p>
				{stats.profitFactor &&
					stats.profitFactor[
						comparisonType === "PERIOD" ? "previous" : "initial"
					] > 0 && (
						<StatChange
							{...stats.profitFactor}
							comparisonType={comparisonType}
							format={(val) => val.toFixed(1)}
						/>
					)}
			</div>

			<div className="bg-dark p-3 md:p-4 rounded-lg border border-gray-800 relative">
				<h3 className="text-gray-400 text-xs md:text-sm">Total Trades</h3>
				<p className="text-lg md:text-2xl font-bold text-foreground mt-1">
					{stats.trades.current}
				</p>
				{stats.trades[comparisonType === "PERIOD" ? "previous" : "initial"] >
					0 && (
					<StatChange
						{...stats.trades}
						comparisonType={comparisonType}
						format={(val) => val.toFixed(0)}
						isTradeCount
					/>
				)}
			</div>
		</div>
	)
}
