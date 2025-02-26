"use client";

import useProtectedRoute from "@/hooks/useProtectedRoute";
import Loader from "@/components/Loader";
export default function Home() {
  const { user, loading } = useProtectedRoute();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-accent mb-4">
        Welcome {user?.displayName}!
      </h1>
      <p className="text-gray-400">
        Access the dashboard to start managing your trades.
      </p>
    </div>
  );
}
