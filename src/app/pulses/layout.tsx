import ProtectedRoute from "@/components/auth/ProtectedRoute"
import { Metadata } from "next"

export const metadata: Metadata = {
	title: "Trading Pulses",
}

export default function PulsesLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return <ProtectedRoute>{children}</ProtectedRoute>
} 