"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/context/AuthContext"
import { usePulse } from "@/hooks/usePulse"
import type { Pulse } from "@/types/pulse"
import { PULSE_STATUS } from "@/types/pulse"
import CreatePulseModal from "@/components/modals/CreatePulseModal"
import Loader from "@/components/ui/LoadingSpinner"
import { formatCurrency, formatRatio } from "@/utils/format"
import { toast } from "sonner"

// Import our new components
import TimeRangeSelector, {
	TimeRange,
} from "@/components/dashboard/TimeRangeSelector"
import StatCard from "@/components/dashboard/StatCard"
import SmallStatCard from "@/components/dashboard/SmallStatCard"
import PulsesTable from "@/components/dashboard/PulsesTable"

// Import utility functions
import {
	calculatePeriodChanges,
	calculateAggregateStats,
} from "@/utils/periodCalculations"

export default function DashboardPage() {
	const { user } = useAuth()
	const { getUserPulses, loading: pulseLoading } = usePulse({
		onError: (message) => toast.error(message)
	})
	const [pulses, setPulses] = useState<Pulse[]>([])
	const [loading, setLoading] = useState(true)
	const [showCreateModal, setShowCreateModal] = useState(false)
	const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>("30D")
	const [periodChange, setPeriodChange] = useState({
		profitLoss: 0,
		avgWin: 0,
		avgLoss: 0,
		profitLossPercentage: 0,
		avgWinPercentage: 0,
		avgLossPercentage: 0,
	})

	const fetchPulses = useCallback(async () => {
		if (!user) return
		try {
			setLoading(true)
			const userPulses = await getUserPulses(user.uid, PULSE_STATUS.ACTIVE)
			if (userPulses) {
				setPulses(userPulses)
				const changes = calculatePeriodChanges(userPulses, selectedTimeRange)
				setPeriodChange(changes)
			}
		} catch (error) {
			console.error("Error fetching pulses:", error)
		} finally {
			setLoading(false)
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [user, selectedTimeRange])

	useEffect(() => {
		fetchPulses()
	}, [fetchPulses])

	const handleTimeRangeChange = (range: TimeRange) => {
		setSelectedTimeRange(range)
	}

	if (loading || pulseLoading) {
		return <Loader />
	}

	const aggregateStats = calculateAggregateStats(pulses)
	const strikeRate =
		aggregateStats.totalTrades > 0
			? (aggregateStats.totalWins / aggregateStats.totalTrades) * 100
			: 0

	// Calculate weighted average win and loss
	const { totalWinAmount, totalLossAmount, totalWins, totalLosses } = pulses.reduce((acc, pulse) => {
		if (!pulse.stats) return acc;
		
		const winAmount = pulse.stats.averageWin * pulse.stats.wins;
		const lossAmount = Math.abs(pulse.stats.averageLoss * pulse.stats.losses);
		
		return {
			totalWinAmount: acc.totalWinAmount + winAmount,
			totalLossAmount: acc.totalLossAmount + lossAmount,
			totalWins: acc.totalWins + pulse.stats.wins,
			totalLosses: acc.totalLosses + pulse.stats.losses
		};
	}, { totalWinAmount: 0, totalLossAmount: 0, totalWins: 0, totalLosses: 0 });

	const avgWin = totalWins > 0 ? (totalWinAmount / totalWins).toFixed(2) : "0";
	const avgLoss = totalLosses > 0 ? (totalLossAmount / totalLosses).toFixed(2) : "0";

	// Calculate aggregate profit factor
	const aggregateProfitFactor = totalLossAmount > 0 
		? (totalWinAmount / totalLossAmount).toFixed(2)
		: "0";

	return (
		<div className="p-0 md:p-6 max-w-[1600px] mx-auto">
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-6">
				<h1 className="text-xl md:text-2xl font-bold text-foreground">
					Dashboard
				</h1>
				<div className="flex items-center gap-4">
					<TimeRangeSelector
						selectedTimeRange={selectedTimeRange}
						onTimeRangeChange={handleTimeRangeChange}
					/>
				</div>
			</div>

			{/* Stats Overview */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-6">
				<StatCard
					title="Profit/Loss"
					value={formatCurrency(aggregateStats.totalProfitLoss)}
					change={periodChange.profitLoss}
					changePercentage={periodChange.profitLossPercentage}
					timeRange={selectedTimeRange}
					prefix=""
				/>

				<StatCard
					title="Profit Factor"
					value={formatRatio(aggregateProfitFactor)}
					timeRange={selectedTimeRange}
					prefix=""
				/>

				<StatCard
					title="Average Win"
					value={formatCurrency(avgWin)}
					change={periodChange.avgWin}
					changePercentage={periodChange.avgWinPercentage}
					timeRange={selectedTimeRange}
					prefix=""
				/>

				<StatCard
					title="Average Loss"
					value={formatCurrency(avgLoss)}
					change={periodChange.avgLoss}
					changePercentage={periodChange.avgLossPercentage}
					timeRange={selectedTimeRange}
					prefix=""
				/>
			</div>

			<div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-6">
				<SmallStatCard
					value={aggregateStats.totalTrades}
					label="Total trades"
				/>

				<SmallStatCard value={aggregateStats.totalLosses} label="Losses" />

				<SmallStatCard value={aggregateStats.totalWins} label="Wins" />

				<SmallStatCard
					value={formatRatio(strikeRate, { decimals: 0, suffix: "%" })}
					label="Strike rate"
				/>
			</div>

			{/* Trading Pulses Section */}
			<PulsesTable
				pulses={pulses}
				onCreatePulse={() => setShowCreateModal(true)}
			/>

			<CreatePulseModal
				isOpen={showCreateModal}
				onClose={() => setShowCreateModal(false)}
				onSuccess={fetchPulses}
			/>
		</div>
	)
}
