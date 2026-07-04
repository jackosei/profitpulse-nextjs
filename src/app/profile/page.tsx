"use client";

import { useState, useEffect, useCallback } from "react";
import { updateProfile, updateEmail, updatePassword } from "firebase/auth";
import useProtectedRoute from "@/hooks/useProtectedRoute";
import { usePulse } from "@/hooks/usePulse";
import { PULSE_STATUS } from '@/types/pulse';
import type { Pulse } from '@/types/pulse';
import Loader from "@/components/ui/LoadingSpinner";
import { toast } from 'sonner';
import { ChevronDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import DeleteAccountModal from '@/components/modals/DeleteAccountModal';
import ArchivePulseModal from '@/components/modals/ArchivePulseModal';

export default function ProfilePage() {
  const { user, loading: authLoading } = useProtectedRoute();
  const { getUserPulses, unarchivePulse, loading: pulseLoading } = usePulse({
    onError: (message) => toast.error(message)
  });
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [archivedPulses, setArchivedPulses] = useState<Pulse[]>([]);
  const [loadingPulses, setLoadingPulses] = useState(true);
  const [openSection, setOpenSection] = useState<'profile' | 'archived' | 'journal' | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pulseToUnarchive, setPulseToUnarchive] = useState<Pulse | null>(null);
  const [journalEntries, setJournalEntries] = useState<{ day: string; text: string }[]>([]);
  const [journalHasMore, setJournalHasMore] = useState(false);
  const [journalSearch, setJournalSearch] = useState('');
  const [loadingJournal, setLoadingJournal] = useState(false);
  const [loadingMoreJournal, setLoadingMoreJournal] = useState(false);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const fetchArchivedPulses = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingPulses(true);
      const pulses = await getUserPulses(user.uid, PULSE_STATUS.ARCHIVED);
      if (pulses) {
        setArchivedPulses(pulses);
      }
    } catch {
      console.error('Error fetching archived pulses');
    } finally {
      setLoadingPulses(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    fetchArchivedPulses();
  }, [fetchArchivedPulses]);

  const fetchJournalHistory = useCallback(async (cursor?: string) => {
    if (!user) return;
    const isFresh = !cursor;
    if (isFresh) {
      if (journalEntries.length > 0) return; // already loaded
      setLoadingJournal(true);
    } else {
      setLoadingMoreJournal(true);
    }
    try {
      const { getFirebaseToken } = await import('@/services/firebase/authService');
      const token = await getFirebaseToken();
      if (!token) return;
      const url = `/api/journal?history=true${cursor ? `&before=${cursor}` : ''}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      setJournalEntries(prev => isFresh ? (data.entries ?? []) : [...prev, ...(data.entries ?? [])]);
      setJournalHasMore(data.hasMore ?? false);
    } catch {
      // silently fail
    } finally {
      if (isFresh) setLoadingJournal(false);
      else setLoadingMoreJournal(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleUnarchive = async (pulse: Pulse) => {
    if (!user) return;
    try {
      const success = await unarchivePulse(pulse.id, user.uid);
      if (success) {
        toast.success('Pulse unarchived successfully');
        fetchArchivedPulses();
      }
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
                      <p className="text-sm text-gray-400">{pulse.instruments.join(', ')}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-foreground">Account Size: ${pulse.accountSize}</p>
                        <p className="text-sm text-gray-400">Risk: {pulse.maxRiskPerTrade}%</p>
                      </div>
                      <button
                        onClick={() => setPulseToUnarchive(pulse)}
                        className="px-3 py-1.5 text-sm text-blue-500 hover:text-blue-400 transition-colors"
                        disabled={pulseLoading}
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

        {/* Journal History */}
        <div className="bg-dark rounded-lg border border-gray-800">
          <button
            onClick={() => {
              const next = openSection === 'journal' ? null : 'journal';
              setOpenSection(next);
              if (next === 'journal') fetchJournalHistory();
            }}
            className="w-full flex items-center justify-between p-4 text-left border-b border-gray-800"
          >
            <div>
              <h2 className="text-xl font-semibold text-foreground">Journal History</h2>
              <p className="text-sm text-gray-400">Browse your daily gratitude entries</p>
            </div>
            <ChevronDownIcon
              className={`w-5 h-5 text-gray-400 transition-transform ${
                openSection === 'journal' ? 'transform rotate-180' : ''
              }`}
            />
          </button>

          {openSection === 'journal' && (
            <div className="p-4 space-y-3">
              {/* Search */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={journalSearch}
                  onChange={e => setJournalSearch(e.target.value)}
                  placeholder="Search entries..."
                  className="input-dark w-full pl-9 text-sm"
                />
              </div>

              {loadingJournal ? (
                <p className="text-center text-gray-400 py-6 text-sm">Loading entries…</p>
              ) : (
                <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                  {journalEntries
                    .filter(e =>
                      journalSearch.trim() === '' ||
                      e.text.toLowerCase().includes(journalSearch.toLowerCase())
                    )
                    .map(entry => {
                      const isExpanded = expandedEntries.has(entry.day);
                      const dateLabel = new Date(entry.day + 'T00:00:00Z').toLocaleDateString('en-GB', {
                        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                      });
                      return (
                        <div key={entry.day} className="p-3 rounded-md bg-gray-800/50 border border-gray-700 space-y-1">
                          <p className="text-xs text-accent font-medium">{dateLabel}</p>
                          <p
                            className={`text-sm text-gray-300 whitespace-pre-wrap ${!isExpanded ? 'line-clamp-3' : ''}`}
                          >
                            {entry.text}
                          </p>
                          {entry.text.length > 180 && (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedEntries(prev => {
                                  const next = new Set(prev);
                                  if (isExpanded) next.delete(entry.day);
                                  else next.add(entry.day);
                                  return next;
                                })
                              }
                              className="text-xs text-accent/70 hover:text-accent transition-colors"
                            >
                              {isExpanded ? 'Show less' : 'Show more'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  {journalEntries.filter(e =>
                    journalSearch.trim() === '' ||
                    e.text.toLowerCase().includes(journalSearch.toLowerCase())
                  ).length === 0 && (
                    <p className="text-center text-gray-400 py-6 text-sm">No entries found.</p>
                  )}
                  {journalHasMore && journalSearch.trim() === '' && (
                    <button
                      type="button"
                      onClick={() => {
                        const last = journalEntries[journalEntries.length - 1];
                        if (last) fetchJournalHistory(last.day);
                      }}
                      disabled={loadingMoreJournal}
                      className="w-full py-2 text-sm text-accent/70 hover:text-accent transition-colors disabled:opacity-50"
                    >
                      {loadingMoreJournal ? 'Loading…' : 'Load more'}
                    </button>
                  )}
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