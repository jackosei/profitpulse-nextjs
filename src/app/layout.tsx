import "./globals.css"
import Providers from "@/context/Providers"
import Navbar from "@/components/Navbar"
import Sidebar from "@/components/Sidebar"
import { Toaster } from "sonner"
import FeedbackWidget from "@/components/FeedbackWidget"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/react"
import { Metadata } from "next"

const inter = Inter({
	subsets: ["latin"],
	display: "swap",
	variable: "--font-inter",
})

export const metadata: Metadata = {
	title: {
		template: "%s | ProfitPulse",
		default: "ProfitPulse - Trade Tracking Made Simple",
	},
	description: "Track and analyze your trading performance with ProfitPulse",
}

const RootLayout = ({ children }: { children: React.ReactNode }) => {
	return (
		<html lang="en" className={`${inter.variable}`}>
			<body className="bg-dark-darker font-sans">
				<Providers>
					<div className="flex h-screen">
						{/* Sidebar Navigation */}
						<Sidebar />

						{/* Main Content Area */}
						<div className="flex-1 flex flex-col overflow-hidden">
							<Navbar />
							<main className="flex-1 overflow-y-auto p-4 bg-dark pb-24 md:pb-6">
								{children}
							</main>
						</div>
					</div>
					<FeedbackWidget />
				</Providers>
				<Toaster position="bottom-center" theme="dark" closeButton richColors />
				<Analytics />
			</body>
		</html>
	)
}

export default RootLayout
