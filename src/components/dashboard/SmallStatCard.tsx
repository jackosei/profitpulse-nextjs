import { memo } from "react"

interface SmallStatCardProps {
	value: string | number
	label: string
	suffix?: string
}

function SmallStatCard({ value, label, suffix = "" }: SmallStatCardProps) {
	return (
		<div className="bg-dark p-4 rounded-lg border border-gray-800">
			<p className="text-lg md:text-xl font-bold text-foreground mb-1">
				{value}
				{suffix}
			</p>
			<p className="text-xs md:text-sm text-gray-400">{label}</p>
		</div>
	)
}

export default memo(SmallStatCard)
