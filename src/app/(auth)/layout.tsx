import { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
	title: "Authentication",
}

export default function AuthLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<div className="flex min-h-screen flex-col bg-[#1E1E1E]">
			{/* Route back to the public landing page */}
			<header className="px-4 py-3 sm:px-6">
				<Link
					href="/"
					aria-label="Back to ProfitPulse home"
					className="text-lg font-semibold tracking-tight text-white hover:opacity-80 transition-opacity"
				>
					Profit<span className="text-accent-light">Pulse</span>
				</Link>
			</header>
			<div className="flex flex-1 items-stretch [&>*]:w-full">
				{children}
			</div>
		</div>
	)
}
