"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { getPulseById, getMoreTrades, archivePulse } from "@/services/firestore"
import type { Pulse, Trade } from "@/types/pulse"
import Loader from "@/components/ui/Loader"
import AddTradeModal from "@/components/modals/AddTradeModal"
import DeletePulseModal from "@/components/modals/DeletePulseModal"
import UpdatePulseModal from "@/components/modals/UpdatePulseModal"
import PulseHeader from "@/components/pulse/PulseHeader"
import PulseStats from "@/components/pulse/PulseStats"
import PulseChart from "@/components/pulse/PulseChart"
import TradeHistory from "@/components/pulse/TradeHistory"
import { toast } from "sonner"
import ArchivePulseModal from "@/components/modals/ArchivePulseModal"

type TimeRange = "7D" | "30D" | "90D" | "1Y" | "ALL"
type ComparisonType = "PERIOD" | "START"

export default function PulseDetailsPage() {
	const { id } = useParams()
	const router = useRouter()
	const { user } = useAuth()
	const [pulse, setPulse] = useState<Pulse | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState("")
	const [showAddTradeModal, setShowAddTradeModal] = useState(false)
	const [showDeleteModal, setShowDeleteModal] = useState(false)
	const [loadingMore, setLoadingMore] = useState(false)
	const [hasMore, setHasMore] = useState(false)
	const [lastVisible, setLastVisible] = useState<string | null>(null)
	const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>("30D")
	const [comparisonType, setComparisonType] = useState<ComparisonType>("PERIOD")
	const [periodStats, setPeriodStats] = useState<{
		winRate: { current: number; previous: number; initial: number }
		totalPL: { current: number; previous: number; initial: number }
		plPercentage: { current: number; previous: number; initial: number }
		trades: { current: number; previous: number; initial: number }
		profitFactor: { current: number; previous: number; initial: number }
	}>({
		winRate: { current: 0, previous: 0, initial: 0 },
		totalPL: { current: 0, previous: 0, initial: 0 },
		plPercentage: { current: 0, previous: 0, initial: 0 },
		trades: { current: 0, previous: 0, initial: 0 },
		profitFactor: { current: 0, previous: 0, initial: 0 },
	})
	const [showArchiveModal, setShowArchiveModal] = useState(false)
	const [showUpdateModal, setShowUpdateModal] = useState(false)

	const fetchPulse = useCallback(async () => {
		if (!user || !id) return
		try {
			const pulseData = await getPulseById(id as string, user.uid)
			setPulse(pulseData)
			setHasMore(pulseData.hasMore)
			setLastVisible(pulseData.lastVisible)
		} catch (error) {
			console.error("Error fetching pulse:", error)
			setError("Failed to load pulse details")
		} finally {
			setLoading(false)
		}
	}, [user, id])

	const loadMoreTrades = useCallback(async () => {
		if (!pulse || !lastVisible || loadingMore) return

		setLoadingMore(true)
		try {
			const result = await getMoreTrades(pulse.firestoreId || "", lastVisible)
			setPulse((prev) => {
				if (!prev) return null
				return {
					...prev,
					trades: [...(prev.trades || []), ...result.trades] as Trade[],
				}
			})
			setHasMore(result.hasMore)
			setLastVisible(result.lastVisible)
		} catch (error) {
			console.error("Error loading more trades:", error)
		} finally {
			setLoadingMore(false)
		}
	}, [pulse, lastVisible, loadingMore])

	const handlePulseDeleted = useCallback(() => {
		router.push("/dashboard")
	}, [router])

	const handleArchive = async () => {
		if (!user || !pulse) return
		try {
			await archivePulse(pulse.id, user.uid)
			toast.success("Pulse archived successfully")
			router.push("/dashboard")
		} catch {
			toast.error("Failed to archive pulse")
		}
	}

	// Calculate stats for the selected time range
	const calculatePeriodStats = useCallback(
		(trades: Trade[], range: TimeRange) => {
			const now = new Date()
			let daysToSubtract = 30 // default to 30 days

			switch (range) {
				case "7D":
					daysToSubtract = 7
					break
				case "30D":
					daysToSubtract = 30
					break
				case "90D":
					daysToSubtract = 90
					break
				case "1Y":
					daysToSubtract = 365
					break
				case "ALL":
					daysToSubtract = 36500
					break
			}

			const periodStart = new Date(
				now.getTime() - daysToSubtract * 24 * 60 * 60 * 1000
			)
			const previousPeriodStart = new Date(
				periodStart.getTime() - daysToSubtract * 24 * 60 * 60 * 1000
			)

			// Sort trades by date
			const sortedTrades = [...trades].sort(
				(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
			)

			// Get initial trades (first period's worth of trades)
			const initialPeriodEnd = new Date(
				new Date(sortedTrades[0]?.date || now).getTime() +
					daysToSubtract * 24 * 60 * 60 * 1000
			)
			const initialTrades = sortedTrades.filter(
				(trade) => new Date(trade.date) <= initialPeriodEnd
			)

			// Current and previous period trades
			const currentPeriodTrades = trades.filter(
				(trade) => new Date(trade.date) >= periodStart
			)
			const previousPeriodTrades = trades.filter((trade) => {
				const tradeDate = new Date(trade.date)
				return tradeDate >= previousPeriodStart && tradeDate < periodStart
			})

			// Calculate stats for a period
			const calculateStats = (periodTrades: Trade[]) => {
				const wins = periodTrades.filter((t) => t.outcome === "Win").length
				const total = periodTrades.length
				const pl = periodTrades.reduce((sum, t) => sum + t.profitLoss, 0)

				// Calculate profit factor
				const winningTrades = periodTrades.filter((t) => t.outcome === "Win")
				const losingTrades = periodTrades.filter((t) => t.outcome === "Loss")
				const totalGrossProfit = winningTrades.reduce(
					(sum, t) => sum + t.profitLoss,
					0
				)
				const totalGrossLoss = losingTrades.reduce(
					(sum, t) => sum + Math.abs(t.profitLoss),
					0
				)
				const profitFactor =
					totalGrossLoss > 0 ? totalGrossProfit / totalGrossLoss : 0

				return {
					winRate: total > 0 ? (wins / total) * 100 : 0,
					totalPL: pl,
					plPercentage: pulse?.accountSize ? (pl / pulse.accountSize) * 100 : 0,
					trades: total,
					profitFactor: profitFactor,
				}
			}

			const currentStats = calculateStats(currentPeriodTrades)
			const previousStats = calculateStats(previousPeriodTrades)
			const initialStats = calculateStats(initialTrades)

			setPeriodStats({
				winRate: {
					current: currentStats.winRate,
					previous: previousStats.winRate,
					initial: initialStats.winRate,
				},
				totalPL: {
					current: currentStats.totalPL,
					previous: previousStats.totalPL,
					initial: initialStats.totalPL,
				},
				plPercentage: {
					current: currentStats.plPercentage,
					previous: previousStats.plPercentage,
					initial: initialStats.plPercentage,
				},
				trades: {
					current: currentStats.trades,
					previous: previousStats.trades,
					initial: initialStats.trades,
				},
				profitFactor: {
					current: currentStats.profitFactor,
					previous: previousStats.profitFactor,
					initial: initialStats.profitFactor,
				},
			})
		},
		[pulse?.accountSize]
	)

	// Update stats when time range changes
	useEffect(() => {
		if (pulse?.trades) {
			calculatePeriodStats(pulse.trades, selectedTimeRange)
		}
	}, [pulse?.trades, selectedTimeRange, calculatePeriodStats])

	useEffect(() => {
		fetchPulse()
	}, [fetchPulse])

	if (loading) return <Loader />
	if (error) return <div className="p-6 text-red-500">{error}</div>
	if (!pulse) return <div className="p-6">Pulse not found</div>

	return (
		<div className="min-h-screen p-0 md:p-6 space-y-4 md:space-y-6">
			<PulseHeader
				name={pulse.name}
				instrument={pulse.instruments?.join(', ') || 'N/A'}
				accountSize={pulse.accountSize}
				createdAt={pulse.createdAt}
				selectedTimeRange={selectedTimeRange}
				comparisonType={comparisonType}
				onTimeRangeChange={setSelectedTimeRange}
				onComparisonTypeChange={() =>
					setComparisonType((prev) => (prev === "PERIOD" ? "START" : "PERIOD"))
				}
				onArchive={() => setShowArchiveModal(true)}
				onDelete={() => setShowDeleteModal(true)}
				onUpdate={() => setShowUpdateModal(true)}
				maxRiskPerTrade={pulse.maxRiskPerTrade}
				maxDailyDrawdown={pulse.maxDailyDrawdown}
				maxTotalDrawdown={pulse.maxTotalDrawdown}
				status={pulse.status}
				ruleViolations={pulse.ruleViolations}
			/>

			<PulseStats stats={periodStats} comparisonType={comparisonType} />

			{/* Chart section */}
			<div className="bg-dark p-3 md:p-4 rounded-lg border border-gray-800 h-[250px] md:h-[300px]">
				{pulse.trades && pulse.trades.length > 0 ? (
					<PulseChart trades={pulse.trades} timeRange={selectedTimeRange} />
				) : (
					<div className="h-full flex items-center justify-center text-gray-400">
						No trades recorded yet
					</div>
				)}
			</div>

			<TradeHistory
				trades={pulse.trades || []}
				hasMore={hasMore}
				loadingMore={loadingMore}
				onLoadMore={loadMoreTrades}
				onAddTrade={() => setShowAddTradeModal(true)}
			/>

			<AddTradeModal
				isOpen={showAddTradeModal}
				onClose={() => setShowAddTradeModal(false)}
				onSuccess={fetchPulse}
				pulseId={pulse.id}
				firestoreId={pulse.firestoreId || ""}
				userId={user!.uid}
				maxRiskPercentage={pulse.maxRiskPerTrade}
				accountSize={pulse.accountSize}
			/>

			<UpdatePulseModal
				isOpen={showUpdateModal}
				onClose={() => setShowUpdateModal(false)}
				onSuccess={fetchPulse}
				pulse={pulse}
			/>

			<DeletePulseModal
				isOpen={showDeleteModal}
				onClose={() => setShowDeleteModal(false)}
				pulse={{
					id: pulse.id,
					name: pulse.name,
				}}
				onSuccess={handlePulseDeleted}
			/>

			<ArchivePulseModal
				isOpen={showArchiveModal}
				onClose={() => setShowArchiveModal(false)}
				onConfirm={handleArchive}
				pulseName={pulse.name}
			/>
		</div>
	)
}
