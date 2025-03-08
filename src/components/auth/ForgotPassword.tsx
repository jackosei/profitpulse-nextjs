"use client";

import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/services/config";
import Link from "next/link";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (err: Error | unknown) {
      setError(err instanceof Error ? err.message : "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100%] bg-[#1E1E1E] text-white">
      <div className="w-full max-w-md mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-accent">ProfitPulse</h1>
        </div>

        <div>
          <h2 className="text-xl mb-6">Reset your password</h2>

          {error && <p className="text-red-500 mb-4">{error}</p>}
          {success && (
            <p className="text-green-500 mb-4">
              Password reset email sent! Check your inbox.
            </p>
          )}

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <label className="block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 rounded-lg bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full p-3 bg-green-500 rounded-lg hover:bg-green-600 disabled:bg-gray-600 transition-colors"
            >
              Send Reset Link
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-white/60">
            Remember your password?{" "}
            <Link href="/login" className="text-white hover:text-green-500">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 