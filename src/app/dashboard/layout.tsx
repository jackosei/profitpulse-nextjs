import ProtectedRoute from "@/components/ProtectedRoute"
import { Metadata } from "next"

export const metadata: Metadata = {
	title: "Dashboard",
}

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return <ProtectedRoute>{children}</ProtectedRoute>
}
