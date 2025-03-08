"use client";

import { useState, useEffect, useCallback } from "react";
import { updateProfile, updateEmail, updatePassword } from "firebase/auth";
import useProtectedRoute from "@/hooks/useProtectedRoute";
import { getUserPulses, unarchivePulse } from '@/services/firestore';
import { PULSE_STATUS } from '@/types/pulse';
import type { Pulse } from '@/types/pulse';
import Loader from "@/components/ui/Loader";
import { toast } from 'sonner';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import DeleteAccountModal from '@/components/modals/DeleteAccountModal';
import ArchivePulseModal from '@/components/modals/ArchivePulseModal';

export default function ProfilePage() {
  const { user, loading: authLoading } = useProtectedRoute();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [archivedPulses, setArchivedPulses] = useState<(Pulse & { firestoreId: string })[]>([]);
  const [loadingPulses, setLoadingPulses] = useState(true);
  const [openSection, setOpenSection] = useState<'profile' | 'archived' | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pulseToUnarchive, setPulseToUnarchive] = useState<Pulse | null>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const fetchArchivedPulses = useCallback(async () => {
    if (!user) return;
    try {
      const pulses = await getUserPulses(user.uid, PULSE_STATUS.ARCHIVED);
      setArchivedPulses(pulses);
    } catch {
      console.error('Error fetching archived pulses');
    } finally {
      setLoadingPulses(false);
    }
  }, [user]);

  useEffect(() => {
    fetchArchivedPulses();
  }, [fetchArchivedPulses]);

  const handleUnarchive = async (pulse: Pulse) => {
    if (!user) return;
    try {
      await unarchivePulse(pulse.id, user.uid);
      toast.success('Pulse unarchived successfully');
      fetchArchivedPulses();
    } catch {
      toast.error('Failed to unarchive pulse');
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (!user) throw new Error("No user logged in");

      if (displayName !== user.displayName) {
        await updateProfile(user, { displayName });
      }

      if (email !== user.email) {
        await updateEmail(user, email);
      }

      if (newPassword) {
        if (newPassword !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        await updatePassword(user, newPassword);
        setNewPassword("");
        setConfirmPassword("");
      }

      setSuccess("Profile updated successfully!");
    } catch (err: Error | unknown) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loadingPulses) {
    return <Loader />;
  }

  return (
    <div className="max-w-2xl mx-auto p-0 pb-20 md:p-6">
      <h1 className="text-2xl font-bold text-foreground mb-6">Account</h1>

      {/* Profile Section */}
      <div className="space-y-4">
        <div className="bg-dark rounded-lg border border-gray-800">
          <button
            onClick={() => setOpenSection(openSection === 'profile' ? null : 'profile')}
            className="w-full flex items-center justify-between p-4 text-left border-b border-gray-800"
          >
            <h2 className="text-xl font-semibold text-foreground">Profile Settings</h2>
            <ChevronDownIcon 
              className={`w-5 h-5 text-gray-400 transition-transform ${
                openSection === 'profile' ? 'transform rotate-180' : ''
              }`}
            />
          </button>
          
          {openSection === 'profile' && (
            <div className="p-4">
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
            </div>
          )}
        </div>

        {/* Archived Pulses Section */}
        <div className="bg-dark rounded-lg border border-gray-800">
          <button
            onClick={() => setOpenSection(openSection === 'archived' ? null : 'archived')}
            className="w-full flex items-center justify-between p-4 text-left border-b border-gray-800"
          >
            <div>
              <h2 className="text-xl font-semibold text-foreground">Archived Pulses</h2>
              <p className="text-sm text-gray-400">View and manage your archived pulses</p>
            </div>
            <ChevronDownIcon 
              className={`w-5 h-5 text-gray-400 transition-transform ${
                openSection === 'archived' ? 'transform rotate-180' : ''
              }`}
            />
          </button>
          
          {openSection === 'archived' && (
            <div className="divide-y divide-gray-800">
              {archivedPulses.map((pulse) => (
                <div 
                  key={pulse.id} 
                  className="p-4 hover:bg-gray-800/50"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium text-foreground">{pulse.name}</h3>
                      <p className="text-sm text-gray-400">{pulse.instrument}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-foreground">Account Size: ${pulse.accountSize}</p>
                        <p className="text-sm text-gray-400">Risk: {pulse.maxRiskPerTrade}%</p>
                      </div>
                      <button
                        onClick={() => setPulseToUnarchive(pulse)}
                        className="px-3 py-1.5 text-sm text-blue-500 hover:text-blue-400 transition-colors"
                      >
                        Unarchive
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {archivedPulses.length === 0 && (
                <div className="p-4 text-center text-gray-400">
                  No archived pulses found.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Danger Zone */}
        <div className="bg-dark p-6 rounded-lg border border-red-900">
          <h2 className="text-xl font-semibold text-red-500 mb-4">Danger Zone</h2>
          <p className="text-gray-400 mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
          >
            Delete Account
          </button>
        </div>
      </div>

      <DeleteAccountModal 
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
      />

      <ArchivePulseModal
        isOpen={!!pulseToUnarchive}
        onClose={() => setPulseToUnarchive(null)}
        onConfirm={async () => {
          if (pulseToUnarchive) {
            await handleUnarchive(pulseToUnarchive);
          }
        }}
        pulseName={pulseToUnarchive?.name || ''}
        isUnarchiving
      />
    </div>
  );
} 