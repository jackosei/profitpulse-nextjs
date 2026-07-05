"use client"

import { useEffect, useState } from "react"
import { DotLottieReact } from "@lottiefiles/dotlottie-react"

/**
 * Decorative hero animation. Self-hosted .lottie asset; autoplay is skipped
 * for users who prefer reduced motion (the first frame still renders).
 */
export default function HeroLottie() {
	const [reduceMotion, setReduceMotion] = useState(false)

	useEffect(() => {
		setReduceMotion(
			window.matchMedia("(prefers-reduced-motion: reduce)").matches,
		)
	}, [])

	return (
		<div aria-hidden className="pointer-events-none select-none">
			<DotLottieReact
				src="/assets/lottie/fin_charts.lottie"
				loop={!reduceMotion}
				autoplay={!reduceMotion}
			/>
		</div>
	)
}
