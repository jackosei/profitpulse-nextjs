"use client";

import useProtectedRoute from "@/hooks/useProtectedRoute";

export default function Home() {
  const { user, loading } = useProtectedRoute();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-accent mb-4">
        Welcome {user?.displayName}!
      </h1>
      <p className="text-gray-400">
        This is your dashboard. Start managing your trades.
      </p>
    </div>
  );
}
