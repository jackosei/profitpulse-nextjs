import ProtectedRoute from "@/components/auth/ProtectedRoute"
import { Metadata } from "next"

export const metadata: Metadata = {
	title: "Profile",
}

export default function ProfilePage({
	children,
}: {
	children: React.ReactNode
}) {
	return <ProtectedRoute>{children}</ProtectedRoute>
}
