"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useProtectedRoute from "@/hooks/useProtectedRoute";

export default function Home() {
  const { user, loading } = useProtectedRoute();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login"); // Redirect logged-out users to login
    }
  }, [user, loading, router]);

  if (loading) {
    // Explicitly render a loading screen, not redirecting to login
    return <p>Loading...</p>;
  }

  if (loading) return <p>Loading...</p>;

  return <div className="p-6">Welcome {user?.email} to your Dashboard!</div>;
}
