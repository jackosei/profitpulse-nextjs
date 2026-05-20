import { formatCurrency, formatRatio } from "@/utils/format"

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

	let color = "text-gray-500"
	let bg = "bg-gray-500/10"
	if (!isEqual) {
		if (isTradeCount) {
			color = diff > 0 ? "text-blue-400" : "text-gray-500"
			bg = diff > 0 ? "bg-blue-500/10" : "bg-gray-500/10"
		} else {
			color = diff > 0 ? "text-emerald-400" : "text-red-400"
			bg = diff > 0 ? "bg-emerald-500/10" : "bg-red-500/10"
		}
	}

	const label = isEqual
		? "0%"
		: `${diff > 0 ? "+" : ""}${format ? format(percentChange) : percentChange.toFixed(1)}%`

	return (
		<span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${color} ${bg}`}>
			{!isEqual && <span>{diff > 0 ? "↑" : "↓"}</span>}
			{label}
		</span>
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
	const plPositive = stats.totalPL.current > 0
	const plNegative = stats.totalPL.current < 0

	const winRateColor = stats.winRate.current >= 50 ? "text-emerald-400" : stats.winRate.current >= 40 ? "text-amber-400" : "text-red-400"
	const plColor = plPositive ? "text-emerald-400" : plNegative ? "text-red-400" : "text-gray-200"
	const pfColor = (stats.profitFactor?.current ?? 0) >= 1.5 ? "text-emerald-400" : (stats.profitFactor?.current ?? 0) >= 1 ? "text-amber-400" : "text-red-400"

	return (
		<div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
			{/* Win Rate */}
			<StatCard accentColor="border-l-blue-500/60" label="Win Rate">
				<div className="flex items-end justify-between gap-2">
					<span className={`text-2xl font-bold tabular-nums leading-none ${winRateColor}`}>
						{formatRatio(stats.winRate.current, { suffix: "%" })}
					</span>
					{stats.winRate[comparisonType === "PERIOD" ? "previous" : "initial"] > 0 && (
						<StatChange {...stats.winRate} comparisonType={comparisonType} />
					)}
				</div>
			</StatCard>

			{/* P/L */}
			<StatCard accentColor={plPositive ? "border-l-emerald-500/60" : plNegative ? "border-l-red-500/60" : "border-l-gray-600/60"} label="Profit / Loss">
				<div className="flex items-end justify-between gap-2">
					<div>
						<span className={`text-2xl font-bold tabular-nums leading-none ${plColor}`}>
							{formatCurrency(stats.totalPL.current)}
						</span>
						<span className={`text-xs font-medium ml-1.5 ${plColor} opacity-70`}>
							({formatRatio(stats.plPercentage.current, { suffix: "%" })})
						</span>
					</div>
					{stats.totalPL[comparisonType === "PERIOD" ? "previous" : "initial"] !== 0 && (
						<StatChange {...stats.totalPL} comparisonType={comparisonType} format={(val) => formatRatio(val)} />
					)}
				</div>
			</StatCard>

			{/* Profit Factor */}
			<StatCard accentColor="border-l-purple-500/60" label="Profit Factor">
				<div className="flex items-end justify-between gap-2">
					<span className={`text-2xl font-bold tabular-nums leading-none ${pfColor}`}>
						{formatRatio(stats.profitFactor?.current || 0)}
					</span>
					{stats.profitFactor && stats.profitFactor[comparisonType === "PERIOD" ? "previous" : "initial"] > 0 && (
						<StatChange {...stats.profitFactor} comparisonType={comparisonType} format={(val) => formatRatio(val)} />
					)}
				</div>
			</StatCard>

			{/* Total Trades */}
			<StatCard accentColor="border-l-gray-600/60" label="Total Trades">
				<div className="flex items-end justify-between gap-2">
					<span className="text-2xl font-bold tabular-nums leading-none text-gray-100">
						{stats.trades.current}
					</span>
					{stats.trades[comparisonType === "PERIOD" ? "previous" : "initial"] > 0 && (
						<StatChange {...stats.trades} comparisonType={comparisonType} format={(val) => formatRatio(val, { decimals: 0 })} isTradeCount />
					)}
				</div>
			</StatCard>
		</div>
	)
}

function StatCard({ label, accentColor, children }: { label: string; accentColor: string; children: React.ReactNode }) {
	return (
		<div className={`bg-dark p-4 rounded-lg border border-gray-800 border-l-2 ${accentColor} flex flex-col gap-2`}>
			<p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
			{children}
		</div>
	)
}
