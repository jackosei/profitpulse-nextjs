"use client"

import { useState, useEffect } from "react"
import {
	signInWithGoogle,
	signInWithEmail,
	handleRedirectResult,
} from "@/services/auth"
import { auth } from "@/services/firestoreConfig"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { setSessionCookie } from "@/services/auth"

export default function Login() {
	const router = useRouter()
	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState("")

	useEffect(() => {
		const checkRedirectResult = async () => {
			try {
				const result = await handleRedirectResult()
				if (result.success && result.user) {
					await setSessionCookie()
					router.push("/")
				} else if (result.error) {
					setError(result.message || "Sign in failed")
				}
			} catch (err) {
				console.error("Redirect error:", err)
			} finally {
				setLoading(false)
			}
		}

		const unsubscribe = auth.onAuthStateChanged((user) => {
			if (user) {
				router.push("/")
			}
			if (!user) {
				checkRedirectResult()
			} else {
				setLoading(false)
			}
		})

		return () => unsubscribe()
	}, [router])

	const handleGoogleSignIn = async () => {
		setLoading(true)
		setError("")

		try {
			const userData = await signInWithGoogle()
			// For mobile, the redirect will happen here and the result will be handled by useEffect
			if (!userData.success && userData.message) {
				setError(userData.message)
			}
		} catch (err) {
			setError(typeof err === "string" ? err : "Failed to sign in")
		} finally {
			setLoading(false)
		}
	}

	const handleEmailSignIn = async (e: React.FormEvent) => {
		e.preventDefault()
		setLoading(true)
		setError("")

		try {
			const userData = await signInWithEmail(email, password)
			if (userData.success && userData.user) {
				await setSessionCookie()
				router.push("/")
			} else {
				setError(userData.message || "Sign in failed")
			}
		} catch (err) {
			setError(typeof err === "string" ? err : "Failed to sign in")
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="flex flex-col md:flex-row min-h-full bg-[#1E1E1E] text-white">
			{/* Left Section */}
			<div className="w-full md:w-1/2 p-4 md:p-8">
				<div className="max-w-md mx-auto">
					<h1 className="text-xl mb-6 font-bold">
						Welcome Back! Please enter your account details
					</h1>

					{error && <p className="text-red-500 mb-4">{error}</p>}

					<form onSubmit={handleEmailSignIn} className="space-y-4">
						<div className="space-y-2">
							<label className="block">Email</label>
							<input
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className="w-full p-3 rounded-lg bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-green-500"
								placeholder="Johndoe@gmail.com"
								required
							/>
						</div>

						<div className="space-y-2">
							<label className="block">Password</label>
							<input
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="w-full p-3 rounded-lg bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-green-500"
								placeholder="••••••••"
								required
							/>
						</div>

						<Link
							href="/forgot-password"
							className="block text-sm text-right hover:text-green-500"
						>
							Forgot Password
						</Link>

						<button
							type="submit"
							disabled={loading}
							className="w-full p-3 bg-green-500 rounded-lg hover:bg-green-600 disabled:bg-gray-600 transition-colors"
						>
							Sign in
						</button>
					</form>

					<div className="mt-6 space-y-4">
						<div className="relative">
							<div className="absolute inset-0 flex items-center">
								<div className="w-full border-t border-white/20"></div>
							</div>
							<div className="relative flex justify-center text-sm">
								<span className="px-2 bg-[#1E1E1E] text-white/60">
									or continue with
								</span>
							</div>
						</div>

						<div className="flex gap-4 justify-center">
							<button
								type="button"
								onClick={(e) => {
									e.preventDefault()
									handleGoogleSignIn()
								}}
								className="flex items-center justify-center gap-2 w-full p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
							>
								<Image
									src="/assets/icons/google-icon.svg"
									alt="Google"
									width={24}
									height={24}
								/>
								<span>Sign in with Google</span>
							</button>
						</div>
					</div>

					<p className="mt-8 text-center text-sm text-white/60">
						Don&apos;t have an account?{" "}
						<Link href="/signup" className="text-white hover:text-green-500">
							Create an account
						</Link>
					</p>
				</div>
			</div>

			{/* Right Section */}
			<div className="hidden md:flex w-full md:w-1/2 bg-green-500 p-8 items-center">
				<div className="max-w-md mx-auto">
					<div className="mb-8">
						<h2 className="text-4xl font-semibold mb-4">Welcome Back!</h2>
						<blockquote className="text-lg">
							&quot;ProfitPulse has transformed how I manage my business
							finances. The real-time insights and intuitive dashboard make
							financial tracking a breeze.&quot;
						</blockquote>
						<div className="mt-4">
							<p className="font-semibold">Sarah Chen</p>
							<p className="text-sm">Small Business Owner</p>
						</div>
					</div>

					<div className="flex justify-between items-center">
						<div className="flex gap-2">
							<button className="p-2 rounded-lg bg-white/20 hover:bg-white/30">
								<span className="sr-only">Previous</span>
								{/* Add left arrow icon */}
							</button>
							<button className="p-2 rounded-lg bg-white/20 hover:bg-white/30">
								<span className="sr-only">Next</span>
								{/* Add right arrow icon */}
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
