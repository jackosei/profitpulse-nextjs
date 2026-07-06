import "./globals.css"
import Providers from "@/context/Providers"
import { Toaster } from "sonner"
import ErrorBoundary from "@/components/ui/ErrorBoundary"
import { Inter } from "next/font/google"
import { Metadata } from "next"

const inter = Inter({
	subsets: ["latin"],
	display: "swap",
	variable: "--font-inter",
})

export const metadata: Metadata = {
	metadataBase: new URL(
		process.env.NEXT_PUBLIC_SITE_URL ?? "https://profitpulse.qzz.io",
	),
	title: {
		template: "%s | ProfitPulse",
		default: "ProfitPulse: The Trading Journal That Enforces Your Rules",
	},
	description:
		"Track and analyze your trading performance with ProfitPulse. The built-in Discipline Engine scores every rule violation and enforces real consequences.",
}

const RootLayout = ({ children }: { children: React.ReactNode }) => {
	return (
		<html lang="en" className={`${inter.variable}`}>
			<body className="bg-dark-darker font-sans">
				<ErrorBoundary>
					<Providers>{children}</Providers>
					<Toaster
						position="bottom-center"
						theme="dark"
						closeButton
						richColors
					/>
				</ErrorBoundary>
			</body>
		</html>
	)
}

export default RootLayout
