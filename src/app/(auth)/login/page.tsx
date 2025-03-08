"use client";

import Login from "@/components/auth/Login";
import useProtectedRoute from "@/hooks/useProtectedRoute";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const { user, loading } = useProtectedRoute();     
  const router = useRouter();

  useEffect(() => {
    if (user && !loading) {
      router.push("/");
    }
  }, [user, loading, router]);

  return <Login />;
} 