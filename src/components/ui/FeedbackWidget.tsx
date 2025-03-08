"use client"
import { ChatBubbleLeftIcon } from "@heroicons/react/24/solid"

export default function FeedbackWidget() {
	const handleFeedbackClick = () => {
		window.open("https://profitpulse.featurebase.app/", "_blank")
	}

	return (
		<button
			onClick={handleFeedbackClick}
			className="fixed bottom-16 md:bottom-6 right-6 bg-accent hover:bg-accent/90 text-white p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-105 group z-50"
			aria-label="Provide Feedback"
		>
			<ChatBubbleLeftIcon className="w-5 h-5" />
			<span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-dark text-sm px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
				Give Feedback
			</span>
		</button>
	)
}
