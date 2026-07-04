"use client";

import Login from "@/components/auth/Login";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { APP_HOME } from "@/config/routes";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace(APP_HOME);
    }
  }, [user, loading, router]);

  // Don't flash the login form while auth state resolves or redirect is pending
  if (loading || user) return null;

  return <Login />;
} 