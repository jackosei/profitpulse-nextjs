"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Login from "@/components/Login";

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push("/dashboard"); // Redirect logged-in users
    }
  }, [user, router]);

  return (
    <div className="flex justify-center items-center h-screen">
      <Login />
    </div>
  );
}
