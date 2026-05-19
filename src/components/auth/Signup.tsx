"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { setSessionCookie } from "@/services/api/authApi";
import { auth } from "@/services/firebase/firestoreConfig";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { APP_HOME } from "@/config/routes";

export default function Signup() {
  const router = useRouter();
  const { signUpWithEmail, signInWithGoogle, handleRedirectResult } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        const result = await handleRedirectResult();
        if (result.success && result.data) {
          await setSessionCookie();
          router.push(APP_HOME);
        } else if (result.error) {
          setError(result.error.message || "Sign up failed");
        }
      } catch (err) {
        console.error("Redirect error:", err);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        router.push(APP_HOME);
      }
      if (!user) {
        checkRedirectResult();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router, handleRedirectResult]);

  const handleGoogleSignUp = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await signInWithGoogle();
      if (res.success && res.data) {
        await setSessionCookie();
        router.push(APP_HOME);
      } else if (!res.success) {
        setError(res.error?.message || "Failed to sign up with Google");
      }
    } catch (err) {
      setError(typeof err === "string" ? err : "Failed to sign up with Google");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await signUpWithEmail(email, password);
      if (res.success && res.data) {
        await setSessionCookie();
        router.push(APP_HOME);
      } else {
        setError(res.error?.message || "Failed to create account");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-[100%] bg-[#1E1E1E] text-white w-[95%] md:w-auto">
      <div className="w-full md:w-1/2 p-4 md:p-8">
        <div className="max-w-md mx-auto">
          <h2 className="text-xl mb-6 font-bold">Create your account</h2>

          {error && <p className="text-red-500 mb-4">{error}</p>}

          <form onSubmit={handleSignup} className="space-y-4">
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

            <div className="space-y-2">
              <label className="block">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-3 rounded-lg bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full p-3 bg-green-500 rounded-lg hover:bg-green-600 disabled:bg-gray-600 transition-colors"
            >
              Create Account
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
                  e.preventDefault();
                  handleGoogleSignUp();
                }}
                disabled={loading}
                className="flex items-center justify-center gap-2 w-full p-3 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 transition-colors"
              >
                <Image
                  src="/assets/icons/google-icon.svg"
                  alt="Google"
                  width={24}
                  height={24}
                />
                <span>Sign up with Google</span>
              </button>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-white/60">
            Already have an account?{" "}
            <Link href="/login" className="text-white hover:text-green-500">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Right Section */}
      <div className="hidden md:flex w-full md:w-1/2 relative bg-green-500 p-8 items-center justify-center">
        <div className="max-w-md">
          <h2 className="text-3xl font-bold mb-6">
            Take control of your business finances
          </h2>
          <p className="mb-8 text-lg">
            Track expenses, monitor revenue, and make data-driven decisions with
            ProfitPulse&apos;s comprehensive financial dashboard.
          </p>
          <div className="relative h-64 w-full">
            <Image
              src="/assets/images/dashboard-preview.png"
              alt="Dashboard Preview"
              width={500}
              height={500}
              className="object-cover"
              priority
              style={{ width: "100%", height: "auto" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
