"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { getUserProfile } from "@/firebase/users";

export default function AdminSetup() {
  const { user } = useAuth();
  const [secretKey, setSecretKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdminStatus, setCheckingAdminStatus] = useState(true);

  useEffect(() => {
    async function checkAdminStatus() {
      if (!user) return;
      
      try {
        setCheckingAdminStatus(true);
        const profile = await getUserProfile(user.uid);
        if (profile && profile.role === 'admin') {
          setIsAdmin(true);
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
      } finally {
        setCheckingAdminStatus(false);
      }
    }
    
    checkAdminStatus();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const response = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user.uid,
          secretKey,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to set up admin");
      }

      toast.success("Admin setup successful!", {
        description: "You now have admin privileges.",
      });
    } catch (error) {
      toast.error("Admin setup failed", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setLoading(false);
      setSecretKey("");
    }
  };

  if (!user) {
    return (
      <div className="p-6">
        <p className="text-red-500">You must be logged in to access this page.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6">Admin Setup</h1>
        
        <div className="bg-dark p-6 rounded-lg border border-gray-800">
          {checkingAdminStatus ? (
            <p className="text-center py-4">Checking admin status...</p>
          ) : isAdmin ? (
            <div className="text-center py-4">
              <div className="bg-green-900/30 text-green-400 p-4 rounded-md mb-4">
                <p className="font-medium">You are already an admin</p>
                <p className="text-sm mt-2">You have full administrative privileges.</p>
              </div>
              <p className="text-sm text-gray-400 mt-2">User: {user.email}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Admin Secret Key
                </label>
                <input
                  type="password"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  className="input-dark w-full"
                  required
                  placeholder="Enter the admin secret key"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !secretKey}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {loading ? "Setting up..." : "Set Up Admin"}
                </button>
              </div>
              
              <div className="mt-4 text-sm text-gray-400">
                <p>Current User: {user.email}</p>
                <p>User ID: {user.uid}</p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
} 