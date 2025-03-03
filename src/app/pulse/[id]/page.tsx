"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getPulseById, getMoreTrades } from '@/firebase/firestore';
import type { Pulse, Trade } from '@/types/pulse';
import Loader from '@/components/Loader';
import AddTradeModal from '@/components/modals/AddTradeModal';
import DeletePulseModal from '@/components/modals/DeletePulseModal';
import { TrashIcon } from '@heroicons/react/24/outline';

export default function PulseDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddTradeModal, setShowAddTradeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<string | null>(null);

  const fetchPulse = useCallback(async () => {
    if (!user || !id) return;
    try {
      const pulseData = await getPulseById(id as string, user.uid);
      setPulse(pulseData);
      setHasMore(pulseData.hasMore);
      setLastVisible(pulseData.lastVisible);
    } catch (error) {
      console.error('Error fetching pulse:', error);
      setError('Failed to load pulse details');
    } finally {
      setLoading(false);
    }
  }, [user, id]);

  const loadMoreTrades = useCallback(async () => {
    if (!pulse || !lastVisible || loadingMore) return;
    
    setLoadingMore(true);
    try {
      const result = await getMoreTrades(pulse.firestoreId || '', lastVisible);
      setPulse(prev => {
        if (!prev) return null;
        return {
          ...prev,
          trades: [...(prev.trades || []), ...result.trades] as Trade[]
        };
      });
      setHasMore(result.hasMore);
      setLastVisible(result.lastVisible);
    } catch (error) {
      console.error('Error loading more trades:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [pulse, lastVisible, loadingMore]);

  // Add intersection observer for infinite scroll
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMoreTrades();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadMoreTrades]);

  useEffect(() => {
    fetchPulse();
  }, [fetchPulse]);

  const handlePulseDeleted = useCallback(() => {
    router.push('/dashboard');
  }, [router]);

  if (loading) return <Loader />;
  if (error) return <div className="p-6 text-red-500">{error}</div>;
  if (!pulse) return <div className="p-6">Pulse not found</div>;

  return (
    <div className="p-0 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{pulse.name}</h1>
          <p className="text-gray-400">{pulse.instrument}</p>
        </div>
        <div className="flex items-start gap-4">
          <div className="text-right">
            <p className="text-sm text-gray-400">Account Size</p>
            <p className="text-xl font-bold text-foreground">${pulse.accountSize}</p>
          </div>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
            aria-label="Delete pulse"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-dark p-4 rounded-lg border border-gray-800">
          <h3 className="text-gray-400 text-sm">Win Rate</h3>
          <p className="text-2xl font-bold text-foreground">
            {pulse.stats?.strikeRate.toFixed(1)}%
          </p>
        </div>
        <div className="bg-dark p-4 rounded-lg border border-gray-800">
          <h3 className="text-gray-400 text-sm">Total P/L</h3>
          <p className="text-2xl font-bold text-foreground">
            ${pulse.stats?.totalProfitLoss.toFixed(2)}
          </p>
        </div>
        <div className="bg-dark p-4 rounded-lg border border-gray-800">
          <h3 className="text-gray-400 text-sm">Total Trades</h3>
          <p className="text-2xl font-bold text-foreground">
            {pulse.stats?.totalTrades}
          </p>
        </div>
      </div>

      {/* Chart will go here */}
      <div className="bg-dark p-4 rounded-lg border border-gray-800 h-[300px]">
        <h2 className="text-lg font-semibold text-foreground mb-4">P/L by Day</h2>
        {/* We'll add the chart component here */}
      </div>

      {/* Trade History */}
      <div className="bg-dark rounded-lg border border-gray-800">
        <div className="p-4 border-b border-gray-800">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-foreground">Trade History</h2>
            <button 
              className="btn-primary"
              onClick={() => setShowAddTradeModal(true)}
            >
              Add Trade
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="p-4 text-left text-sm text-gray-400">Date</th>
                <th className="p-4 text-left text-sm text-gray-400">Type</th>
                <th className="p-4 text-left text-sm text-gray-400">Lot Size</th>
                <th className="p-4 text-left text-sm text-gray-400">Entry Reason</th>
                <th className="p-4 text-left text-sm text-gray-400">Outcome</th>
                <th className="p-4 text-right text-sm text-gray-400">P/L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {pulse.trades?.map((trade) => (
                <tr key={trade.id} className="hover:bg-gray-800/50">
                  <td className="p-4 text-foreground">{trade.date}</td>
                  <td className="p-4 text-foreground">{trade.type}</td>
                  <td className="p-4 text-foreground">{trade.lotSize}</td>
                  <td className="p-4 text-foreground">{trade.entryReason}</td>
                  <td className="p-4 text-foreground">{trade.outcome}</td>
                  <td className="p-4 text-right text-foreground">
                    ${trade.profitLoss.toFixed(2)}
                  </td>
                </tr>
              ))}
              {(!pulse.trades || pulse.trades.length === 0) && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-gray-400">
                    No trades recorded yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {hasMore && (
        <div 
          ref={observerTarget}
          className="p-4 text-center text-gray-400"
        >
          {loadingMore ? "Loading more trades..." : "Scroll for more"}
        </div>
      )}

      <AddTradeModal 
        isOpen={showAddTradeModal}
        onClose={() => setShowAddTradeModal(false)}
        onSuccess={fetchPulse}
        pulseId={pulse.id}
        firestoreId={pulse.firestoreId || ''}
        userId={user!.uid}
        maxRiskPercentage={pulse.maxRiskPerTrade}
        accountSize={pulse.accountSize}
      />

      <DeletePulseModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        pulse={{
          id: pulse.id,
          name: pulse.name
        }}
        onSuccess={handlePulseDeleted}
      />
    </div>
  );
} 