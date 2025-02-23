"use client";

import { useState } from "react";
import { signInWithGoogle, signInWithEmail, logout } from "@/firebase/auth";
import { User } from "firebase/auth";

export default function Login() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    try {
      const userData = await signInWithGoogle();
      setUser(userData as User);
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const userData = await signInWithEmail(email, password);
      setUser(userData as User);
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold text-center mb-4">Login</h2>

        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        {user ? (
          <div className="text-center">
            <p className="text-gray-700">Welcome, {user.displayName}</p>
            <button
              className="w-full px-4 py-2 mt-4 bg-red-500 text-white rounded-lg hover:bg-red-600"
              onClick={logout}
            >
              Logout
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full p-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex justify-center"
              >
                {loading ? (
                  <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-5 h-5"></span>
                ) : (
                  "Sign in with Email"
                )}
              </button>
            </form>

            <div className="text-center my-4">or</div>

            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full p-3 text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:bg-gray-400"
            >
              {loading ? "Loading..." : "Sign in with Google"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
