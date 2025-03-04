import type { Config } from "tailwindcss"

const config: Config = {
	content: [
		"./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/components/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/app/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/**/*.{js,ts,jsx,tsx,mdx}",
	],
	theme: {
		extend: {
			colors: {
				background: "var(--background)",
				foreground: "var(--foreground)",
				dark: {
					DEFAULT: "var(--dark)",
					lighter: "var(--dark-lighter)",
					darker: "var(--dark-darker)",
				},
				accent: {
					DEFAULT: "var(--accent)",
					hover: "var(--accent-hover)",
					light: "var(--accent-light)",
				},
				success: "var(--success)",
				error: "var(--error)",
			},
			fontFamily: {
				sans: ["var(--font-inter)", "system-ui", "sans-serif"],
			},
		},
	},
	plugins: [],
}

export default config
