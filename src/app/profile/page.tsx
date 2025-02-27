"use client";

import { useState, useEffect } from "react";
import { updateProfile, updateEmail, updatePassword } from "firebase/auth";
import useProtectedRoute from "@/hooks/useProtectedRoute";
import Loader from "@/components/Loader";

export default function ProfileForm() {
  const { user, loading: authLoading } = useProtectedRoute();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setEmail(user.email || "");
    }
  }, [user]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader />
      </div>
    );
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (!user) throw new Error("No user logged in");

      // Update display name if changed
      if (displayName !== user.displayName) {
        await updateProfile(user, { displayName });
      }

      // Update email if changed
      if (email !== user.email) {
        await updateEmail(user, email);
      }

      // Update password if provided
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        await updatePassword(user, newPassword);
        // Clear password fields after successful update
        setNewPassword("");
        setConfirmPassword("");
      }

      setSuccess("Profile updated successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      try {
        await user.delete();
      } catch (err: any) {
        setError(err.message || "Failed to delete account");
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6">Account Settings</h1>

      {/* Profile Section */}
      <section className="bg-dark p-6 rounded-lg mb-8 border border-gray-800">
        <h2 className="text-xl font-semibold text-foreground mb-4">Profile</h2>
        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-sm text-gray-400 mb-2">
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="input-dark w-full"
              placeholder="Your display name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm text-gray-400 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-dark w-full"
              placeholder="Your email"
            />
          </div>

          <div className="pt-4 border-t border-gray-800">
            <h3 className="text-lg font-medium text-foreground mb-4">Change Password</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="newPassword" className="block text-sm text-gray-400 mb-2">
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-dark w-full"
                  placeholder="Leave blank to keep current password"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm text-gray-400 mb-2">
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-dark w-full"
                  placeholder="Confirm new password"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-900/50 border border-red-800 rounded-lg">
              <p className="text-red-500 text-sm">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="p-3 bg-accent/10 border border-accent rounded-lg">
              <p className="text-accent-light text-sm">{success}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? "Updating..." : "Save Changes"}
          </button>
        </form>
      </section>

      {/* Danger Zone */}
      <section className="bg-dark p-6 rounded-lg border border-red-900">
        <h2 className="text-xl font-semibold text-red-500 mb-4">Danger Zone</h2>
        <p className="text-gray-400 mb-4">
          Once you delete your account, there is no going back. Please be certain.
        </p>
        <button
          onClick={handleDeleteAccount}
          className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
        >
          Delete Account
        </button>
      </section>
    </div>
  );
} 