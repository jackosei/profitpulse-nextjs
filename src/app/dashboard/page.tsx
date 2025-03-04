"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/context/AuthContext"
import { getUserPulses } from "@/firebase/firestore"
import type { Pulse } from "@/types/pulse"
import { PULSE_STATUS } from "@/types/pulse"
import CreatePulseModal from "@/components/modals/CreatePulseModal"
import Loader from "@/components/Loader"

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
			const userPulses = await getUserPulses(user.uid, PULSE_STATUS.ACTIVE)
			setPulses(userPulses)
			const changes = calculatePeriodChanges(userPulses, selectedTimeRange)
			setPeriodChange(changes)
		} catch (error) {
			console.error("Error fetching pulses:", error)
		} finally {
			setLoading(false)
		}
	}, [user, selectedTimeRange])

	useEffect(() => {
		fetchPulses()
	}, [fetchPulses])

	const handleTimeRangeChange = (range: TimeRange) => {
		setSelectedTimeRange(range)
	}

	if (loading) {
		return <Loader />
	}

	const aggregateStats = calculateAggregateStats(pulses)
	const strikeRate =
		aggregateStats.totalTrades > 0
			? (aggregateStats.totalWins / aggregateStats.totalTrades) * 100
			: 0

	const avgWin =
		aggregateStats.totalWins > 0
			? (aggregateStats.totalProfitLoss / aggregateStats.totalWins).toFixed(0)
			: "0"

	const avgLoss =
		aggregateStats.totalLosses > 0
			? (aggregateStats.totalProfitLoss / aggregateStats.totalLosses).toFixed(0)
			: "0"

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
			<div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-3 md:mb-6">
				<StatCard
					title="Profit/Loss"
					value={aggregateStats.totalProfitLoss.toFixed(2)}
					change={periodChange.profitLoss}
					changePercentage={periodChange.profitLossPercentage}
					timeRange={selectedTimeRange}
				/>

				<StatCard
					title="Average Win ($)"
					value={avgWin}
					change={periodChange.avgWin}
					changePercentage={periodChange.avgWinPercentage}
					timeRange={selectedTimeRange}
				/>

				<StatCard
					title="Average Loss ($)"
					value={avgLoss}
					change={periodChange.avgLoss}
					changePercentage={periodChange.avgLossPercentage}
					timeRange={selectedTimeRange}
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
					value={strikeRate.toFixed(0)}
					label="Strike rate"
					suffix="%"
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
