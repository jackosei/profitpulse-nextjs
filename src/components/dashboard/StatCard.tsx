import { memo } from "react"

interface StatCardProps {
	title: string
	value: string
	change?: number
	changePercentage?: number
	timeRange?: string
	precision?: number
	prefix?: string
}

function StatCard({
	title,
	value,
	change,
	changePercentage,
	timeRange,
	precision = 2,
	prefix = "$",
}: StatCardProps) {
	return (
		<div className="bg-dark p-4 md:p-6 rounded-lg border border-gray-800">
			<div className="flex justify-between items-center mb-2">
				<h3 className="text-gray-400 text-sm md:text-base">{title}</h3>
				{changePercentage !== undefined && changePercentage !== 0 && (
					<span
						className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
							changePercentage >= 0
								? "bg-success/10 text-success"
								: "bg-error/10 text-error"
						}`}
					>
						<svg
							className="w-3 h-3 mr-1"
							viewBox="0 0 24 24"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							{changePercentage >= 0 ? (
								<path
									d="M12 20V4M12 4L5 11M12 4L19 11"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							) : (
								<path
									d="M12 4V20M12 20L5 13M12 20L19 13"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							)}
						</svg>
						{Math.abs(changePercentage).toFixed(0)}%
					</span>
				)}
			</div>
			<p className="text-xl md:text-2xl font-bold text-foreground mb-1">
				{prefix}
				{value}
			</p>
			{change !== undefined && change !== 0 && timeRange && (
				<p
					className={`text-xs md:text-sm ${
						change >= 0 ? "text-success" : "text-error"
					}`}
				>
					{change >= 0 ? "+" : ""}
					{prefix}
					{change.toFixed(precision)} than previous {timeRange}
				</p>
			)}
		</div>
	)
}

export default memo(StatCard)
