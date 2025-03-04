import { memo, useCallback } from "react"
import { useRouter } from "next/navigation"
import type { Pulse } from "@/types/pulse"

interface PulsesTableProps {
	pulses: Pulse[]
	onCreatePulse: () => void
}

function PulseTableRow({ pulse }: { pulse: Pulse }) {
	const router = useRouter()

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

	return (
		<tr
			key={pulse.id}
			className="group hover:bg-gray-800/50 cursor-pointer"
			onClick={handleRowClick}
		>
			<td className="p-4 font-medium text-sm">{pulse.name}</td>
			<td className="p-4 text-gray-400 text-sm">{pulse.instrument}</td>
			<td className="p-4 text-gray-400 text-sm whitespace-nowrap">
				$
				{pulse.accountSize.toLocaleString("en-US", {
					minimumFractionDigits: 2,
					maximumFractionDigits: 2,
				})}
			</td>
			<td className="p-4 text-sm">{pulse.stats?.totalTrades || 0}</td>
			<td className="p-4 text-sm whitespace-nowrap">
				{pulse.stats && pulse.stats.totalTrades > 0
					? ((pulse.stats.wins / pulse.stats.totalTrades) * 100).toFixed(0)
					: 0}
				%
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
					${pulse.stats?.totalProfitLoss?.toFixed(2) || "0.00"}
				</span>
			</td>
			<td className="p-4">
				<button
					className="text-sm text-gray-400 group-hover:text-white border border-gray-800 group-hover:border-gray-600 bg-transparent rounded-md px-3 py-1 transition-all duration-200 transform group-hover:translate-x-1"
					onClick={handleButtonClick}
				>
					→
				</button>
			</td>
		</tr>
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
