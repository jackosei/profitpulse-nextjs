import { memo, useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import type { Pulse } from "@/types/pulse"
import { formatCurrency, formatRatio } from "@/utils/format"
import PulseDetailsModal from "@/components/modals/PulseDetailsModal"

interface PulsesTableProps {
	pulses: Pulse[]
	onCreatePulse: () => void
}

function PulseTableRow({ pulse }: { pulse: Pulse }) {
	const router = useRouter()
	const [showDetailsModal, setShowDetailsModal] = useState(false)

	const handleRowClick = useCallback(() => {
		router.push(`/pulse/${pulse.id}`)
	}, [router, pulse.id])

	const handleButtonClick = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation()
			router.push(`/pulse/${pulse.id}`)
		},
		[router, pulse.id]
	)

	const handleInfoClick = useCallback((e: React.MouseEvent) => {
		e.stopPropagation()
		setShowDetailsModal(true)
	}, [])

	// Calculate risk indicators
	const dailyLoss = pulse.dailyLoss || {}
	const todayKey = new Date().toISOString().split('T')[0]
	const todayLoss = dailyLoss[todayKey] || 0
	const todayLossPercentage = (todayLoss / pulse.accountSize) * 100
	const totalDrawdownPercentage = ((pulse.totalDrawdown || 0) / pulse.accountSize) * 100

	const getRiskIndicator = () => {
		if (pulse.status === 'locked') {
			return {
				color: 'text-red-500',
				icon: '🔒',
				text: 'Locked - Risk Limits Exceeded'
			}
		}
		if (todayLossPercentage > pulse.maxDailyDrawdown * 0.8) {
			return {
				color: 'text-yellow-500',
				icon: '⚠️',
				text: 'Near Daily Drawdown Limit'
			}
		}
		if (totalDrawdownPercentage > pulse.maxTotalDrawdown * 0.8) {
			return {
				color: 'text-yellow-500',
				icon: '⚠️',
				text: 'Near Total Drawdown Limit'
			}
		}
		return null
	}

	const riskIndicator = getRiskIndicator()

	return (
		<>
			<tr
				key={pulse.id}
				className={`group hover:bg-gray-800/50 cursor-pointer ${pulse.status === 'locked' ? 'bg-red-900/10' : ''}`}
				onClick={handleRowClick}
			>
				<td className="p-4 font-medium text-sm">
					<div className="flex items-center gap-2">
						{pulse.name}
						{riskIndicator && (
							<span
								className={`${riskIndicator.color} text-xs`}
								title={riskIndicator.text}
							>
								{riskIndicator.icon}
							</span>
						)}
					</div>
				</td>
				<td className="p-4 text-gray-400 text-sm">
					{Array.isArray(pulse.instruments) ? pulse.instruments.join(', ') : 'No instruments'}
				</td>
				<td className="p-4 text-gray-400 text-sm whitespace-nowrap">
					{formatCurrency(pulse.accountSize)}
				</td>
				<td className="p-4 text-sm">{pulse.stats?.totalTrades || 0}</td>
				<td className="p-4 text-sm whitespace-nowrap">
					{pulse.stats && pulse.stats.totalTrades > 0
						? formatRatio((pulse.stats.wins / pulse.stats.totalTrades) * 100, { suffix: "%", decimals: 0 })
						: "0%"}
				</td>
				<td className="p-4 text-sm whitespace-nowrap">
					<span
						className={
							pulse.stats?.totalProfitLoss
								? pulse.stats.totalProfitLoss >= 0
									? "text-success"
									: "text-error"
								: "text-gray-400"
						}
					>
						{formatCurrency(pulse.stats?.totalProfitLoss || 0)}
					</span>
				</td>
				<td className="p-4 flex gap-2">
					<button
						className="text-sm text-gray-400 hover:text-gray-200"
						onClick={handleInfoClick}
						title="View Details"
					>
						<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</button>
					<button
						className="text-sm text-gray-400 group-hover:text-white border border-gray-800 group-hover:border-gray-600 bg-transparent rounded-md px-3 py-1 transition-all duration-200 transform group-hover:translate-x-1"
						onClick={handleButtonClick}
					>
						→
					</button>
				</td>
			</tr>
			<PulseDetailsModal 
				isOpen={showDetailsModal} 
				onClose={() => setShowDetailsModal(false)} 
				pulse={pulse} 
			/>
		</>
	)
}

const MemoizedPulseTableRow = memo(PulseTableRow)

function PulsesTable({ pulses, onCreatePulse }: PulsesTableProps) {
	return (
		<div className="bg-dark rounded-lg border border-gray-800">
			<div className="p-4 border-b border-gray-800 flex w-full text-nowrap sm:flex-row justify-between sm:items-center gap-3 items-center">
				<h2 className="text-lg md:text-xl font-semibold text-foreground">
					Trading Pulses
				</h2>
				<button
					onClick={onCreatePulse}
					className="btn-primary w-full sm:w-auto"
				>
					Create Pulse
				</button>
			</div>
			<div className="overflow-x-auto">
				<table className="w-full min-w-[800px]">
					<thead className="bg-gray-800/30">
						<tr>
							<th className="text-left p-4 text-gray-400 font-medium text-sm">
								Pulse Name
							</th>
							<th className="text-left p-4 text-gray-400 font-medium text-sm">
								Instrument
							</th>
							<th className="text-left p-4 text-gray-400 font-medium text-sm">
								Account Size
							</th>
							<th className="text-left p-4 text-gray-400 font-medium text-sm">
								Trades
							</th>
							<th className="text-left p-4 text-gray-400 font-medium text-sm">
								Strike Rate
							</th>
							<th className="text-left p-4 text-gray-400 font-medium text-sm">
								Profit/Loss
							</th>
							<th className="text-left p-4 text-gray-400 font-medium text-sm">
								Action
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-800">
						{pulses.map((pulse) => (
							<MemoizedPulseTableRow key={pulse.id} pulse={pulse} />
						))}
					</tbody>
				</table>
				{pulses.length === 0 && (
					<div className="p-4 text-center text-gray-400 text-sm">
						No pulses created yet. Create your first pulse to start tracking
						trades.
					</div>
				)}
			</div>
		</div>
	)
}

export default memo(PulsesTable)
