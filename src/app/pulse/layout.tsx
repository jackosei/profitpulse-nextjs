"use client";

import useProtectedRoute from "@/hooks/useProtectedRoute";
import Loader from "@/components/Loader";

export default function PulseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading } = useProtectedRoute();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader />
      </div>
    );
  }

  return <>{children}</>;
} 