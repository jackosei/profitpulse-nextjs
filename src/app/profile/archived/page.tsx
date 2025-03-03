"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getUserPulses, unarchivePulse } from '@/firebase/firestore';
import { PULSE_STATUS } from '@/types/pulse';
import type { Pulse } from '@/types/pulse';
import Loader from '@/components/Loader';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function ArchivedPulsesPage() {
  const { user } = useAuth();
  const [pulses, setPulses] = useState<(Pulse & { firestoreId: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchArchivedPulses = useCallback(async () => {
    if (!user) return;
    try {
      const archivedPulses = await getUserPulses(user.uid, PULSE_STATUS.ARCHIVED);
      setPulses(archivedPulses);
    } catch (error) {
      console.error('Error fetching archived pulses:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleUnarchive = async (pulseId: string) => {
    if (!user) return;
    try {
      await unarchivePulse(pulseId, user.uid);
      toast.success('Pulse unarchived successfully');
      fetchArchivedPulses();
    } catch (error) {
      toast.error('Failed to unarchive pulse');
    }
  };

  useEffect(() => {
    fetchArchivedPulses();
  }, [fetchArchivedPulses]);

  if (loading) return <Loader />;

  return (
    <div className="p-0 md:p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-foreground">Archived Pulses</h1>
      </div>

      <div className="bg-dark rounded-lg border border-gray-800">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-xl font-semibold text-foreground">Archived Pulses</h2>
          <p className="text-sm text-gray-400 mt-1">View and manage your archived pulses</p>
        </div>
        <div className="divide-y divide-gray-800">
          {pulses.map((pulse) => (
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
                    onClick={() => handleUnarchive(pulse.id)}
                    className="px-3 py-1.5 text-sm text-blue-500 hover:text-blue-400 transition-colors"
                  >
                    Unarchive
                  </button>
                </div>
              </div>
            </div>
          ))}
          {pulses.length === 0 && (
            <div className="p-4 text-center text-gray-400">
              No archived pulses found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 