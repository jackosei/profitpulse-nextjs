import { Metadata } from "next"

export const metadata: Metadata = {
	title: "Authentication",
}

export default function AuthLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<div className="min-h-[100%] flex items-center justify-center">
			{children}
		</div>
	)
}
