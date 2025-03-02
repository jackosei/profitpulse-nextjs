"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getUserPulses } from '@/firebase/firestore';
import type { Pulse } from '@/types/pulse';
import CreatePulseModal from '@/components/modals/CreatePulseModal';
import Loader from '@/components/Loader';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { user } = useAuth();
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const router = useRouter();

  const fetchPulses = async () => {
    if (!user) return;
    try {
      const userPulses = await getUserPulses(user.uid);
      setPulses(userPulses);
    } catch (error) {
      console.error('Error fetching pulses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPulses();
  }, [user]);

  if (loading) {
    return <Loader />;
  }

  const aggregateStats = pulses.reduce((acc, pulse) => {
    if (pulse.stats) {
      acc.totalTrades += pulse.stats.totalTrades;
      acc.totalWins += pulse.stats.wins;
      acc.totalLosses += pulse.stats.losses;
      acc.totalProfitLoss += pulse.stats.totalProfitLoss;
    }
    return acc;
  }, {
    totalTrades: 0,
    totalWins: 0,
    totalLosses: 0,
    totalProfitLoss: 0
  });

  const strikeRate = aggregateStats.totalTrades > 0 
    ? (aggregateStats.totalWins / aggregateStats.totalTrades) * 100 
    : 0;

  return (
    <div className="p-0 md:p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          Create Pulse
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-dark p-4 rounded-lg border border-gray-800">
          <h3 className="text-gray-400 text-sm">Total Trades</h3>
          <p className="text-2xl font-bold text-foreground">{aggregateStats.totalTrades}</p>
        </div>
        <div className="bg-dark p-4 rounded-lg border border-gray-800">
          <h3 className="text-gray-400 text-sm">Total P/L</h3>
          <p className="text-2xl font-bold text-foreground">${aggregateStats.totalProfitLoss.toFixed(2)}</p>
        </div>
        <div className="bg-dark p-4 rounded-lg border border-gray-800">
          <h3 className="text-gray-400 text-sm">Win Rate</h3>
          <p className="text-2xl font-bold text-foreground">{strikeRate.toFixed(1)}%</p>
        </div>
        <div className="bg-dark p-4 rounded-lg border border-gray-800">
          <h3 className="text-gray-400 text-sm">Active Pulses</h3>
          <p className="text-2xl font-bold text-foreground">{pulses.length}</p>
        </div>
      </div>

      {/* Pulses List */}
      <div className="bg-dark rounded-lg border border-gray-800">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-xl font-semibold text-foreground">Your Pulses</h2>
        </div>
        <div className="divide-y divide-gray-800">
          {pulses.map((pulse) => (
            <div 
              key={pulse.id} 
              className="p-4 hover:bg-gray-800/50 cursor-pointer"
              onClick={() => router.push(`/pulse/${pulse.id}`)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium text-foreground">{pulse.name}</h3>
                  <p className="text-sm text-gray-400">{pulse.instrument}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-foreground">Account Size: ${pulse.accountSize}</p>
                  <p className="text-sm text-gray-400">Risk: {pulse.maxRiskPerTrade}%</p>
                </div>
              </div>
            </div>
          ))}
          {pulses.length === 0 && (
            <div className="p-4 text-center text-gray-400">
              No pulses created yet. Create your first pulse to start tracking trades.
            </div>
          )}
        </div>
      </div>

      <CreatePulseModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchPulses}
      />
    </div>
  );
} 