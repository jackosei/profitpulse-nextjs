"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/services/firebase/firestoreConfig";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function Signup() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      router.push('/');
    } catch (err: Error | unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-[100%] bg-[#1E1E1E] text-white w-[95%] md:w-auto">
      <div className="w-full md:w-1/2 p-4 md:p-8">
        

        <div className="max-w-md mx-auto">
          <h2 className="text-xl mb-6">Create your account</h2>

          {error && <p className="text-red-500 mb-4">{error}</p>}

          <form onSubmit={handleSignup} className="space-y-4">
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

            <div className="space-y-2">
              <label className="block">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 rounded-lg bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-green-500"
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
              // fill
              width={500}
              height={500}
              className="object-cover"
              priority
              style={{ width: '100%', height: 'auto' }}
            />
          </div>
        </div>
      </div>

    </div>
  );
} 