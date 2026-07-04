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
		<div className="min-h-screen [&>*]:min-h-screen [&>*]:w-full flex items-stretch">
			{children}
		</div>
	)
}
