"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getPulseById, getMoreTrades, archivePulse } from '@/firebase/firestore';
import type { Pulse, Trade } from '@/types/pulse';
import Loader from '@/components/Loader';
import AddTradeModal from '@/components/modals/AddTradeModal';
import DeletePulseModal from '@/components/modals/DeletePulseModal';
import { Menu } from '@headlessui/react';
import { TrashIcon, ArchiveBoxIcon, EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';

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

  const handleArchive = async () => {
    if (!user || !pulse) return;
    try {
      await archivePulse(pulse.id, user.uid);
      toast.success('Pulse archived successfully');
      router.push('/dashboard');
    } catch (error) {
      toast.error('Failed to archive pulse');
    }
  };

  if (loading) return <Loader />;
  if (error) return <div className="p-6 text-red-500">{error}</div>;
  if (!pulse) return <div className="p-6">Pulse not found</div>;

  return (
    <div className="min-h-screen p-2 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:grid md:grid-cols-3 bg-dark border border-gray-800 rounded-lg p-3 md:p-4">
        {/* Pulse Name and Instrument + Actions Menu on Mobile */}
        <div className="flex flex-col space-y-2 md:col-span-1">
          <div className="flex items-start justify-between md:justify-start">
            <div className="flex flex-col space-y-2 md:flex-row md:items-center md:space-y-0 md:space-x-3">
              <h1 className="text-xl md:text-2xl font-bold text-foreground">{pulse.name}</h1>
              <span className="px-2 py-1 text-sm bg-white/10 rounded-md text-gray-300 w-fit">{pulse.instrument}</span>
            </div>
            {/* Actions Menu - Shown on mobile in first row */}
            <div className="block md:hidden">
              <Menu as="div" className="relative">
                <Menu.Button className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                  <EllipsisVerticalIcon className="w-5 h-5" />
                </Menu.Button>
                <Menu.Items className="absolute right-0 mt-1 w-48 bg-dark border border-gray-800 rounded-lg shadow-lg overflow-hidden z-50">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={handleArchive}
                        className={`${
                          active ? 'bg-white/5' : ''
                        } flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:text-yellow-500`}
                      >
                        <ArchiveBoxIcon className="w-4 h-4 mr-2" />
                        Archive Pulse
                      </button>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => setShowDeleteModal(true)}
                        className={`${
                          active ? 'bg-white/5' : ''
                        } flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:text-red-500`}
                      >
                        <TrashIcon className="w-4 h-4 mr-2" />
                        Delete Pulse
                      </button>
                    )}
                  </Menu.Item>
                </Menu.Items>
              </Menu>
            </div>
          </div>
          <p className="text-sm text-gray-400">Created {new Date(pulse.createdAt?.seconds * 1000).toLocaleDateString()}</p>
        </div>
        
        {/* Account Size */}
        <div className="mt-4 md:mt-0 md:flex md:items-center md:justify-center border-t border-gray-800 pt-4 md:border-0 md:pt-0">
          <div>
            <p className="text-sm text-gray-400">Account Size</p>
            <p className="text-lg md:text-xl font-bold text-foreground">${pulse.accountSize.toLocaleString()}</p>
          </div>
        </div>

        {/* Actions Menu - Desktop Only */}
        <div className="hidden md:flex justify-end items-start">
          <Menu as="div" className="relative">
            <Menu.Button className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <EllipsisVerticalIcon className="w-5 h-5" />
            </Menu.Button>
            <Menu.Items className="absolute right-0 mt-1 w-48 bg-dark border border-gray-800 rounded-lg shadow-lg overflow-hidden z-50">
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={handleArchive}
                    className={`${
                      active ? 'bg-white/5' : ''
                    } flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:text-yellow-500`}
                  >
                    <ArchiveBoxIcon className="w-4 h-4 mr-2" />
                    Archive Pulse
                  </button>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className={`${
                      active ? 'bg-white/5' : ''
                    } flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:text-red-500`}
                  >
                    <TrashIcon className="w-4 h-4 mr-2" />
                    Delete Pulse
                  </button>
                )}
              </Menu.Item>
            </Menu.Items>
          </Menu>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
        <div className="bg-dark p-3 md:p-4 rounded-lg border border-gray-800">
          <h3 className="text-gray-400 text-xs md:text-sm">Win Rate</h3>
          <p className="text-lg md:text-2xl font-bold text-foreground">
            {pulse.stats?.strikeRate.toFixed(1)}%
          </p>
        </div>
        <div className="bg-dark p-3 md:p-4 rounded-lg border border-gray-800">
          <h3 className="text-gray-400 text-xs md:text-sm">Total P/L</h3>
          <p className="text-lg md:text-2xl font-bold text-foreground">
            ${pulse.stats?.totalProfitLoss.toFixed(2)}
          </p>
        </div>
        <div className="col-span-2 md:col-span-1 bg-dark p-3 md:p-4 rounded-lg border border-gray-800">
          <h3 className="text-gray-400 text-xs md:text-sm">Total Trades</h3>
          <p className="text-lg md:text-2xl font-bold text-foreground">
            {pulse.stats?.totalTrades}
          </p>
        </div>
      </div>

      {/* Chart will go here */}
      <div className="bg-dark p-3 md:p-4 rounded-lg border border-gray-800 h-[250px] md:h-[300px]">
        <h2 className="text-base md:text-lg font-semibold text-foreground mb-4">P/L by Day</h2>
        {/* We'll add the chart component here */}
      </div>

      {/* Trade History */}
      <div className="bg-dark rounded-lg border border-gray-800">
        <div className="p-3 md:p-4 border-b border-gray-800">
          <div className="flex justify-between items-center">
            <h2 className="text-base md:text-lg font-semibold text-foreground">Trade History</h2>
            <button 
              className="btn-primary text-sm md:text-base px-3 py-1.5 md:px-4 md:py-2"
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
                <th className="p-3 md:p-4 text-left text-xs md:text-sm text-gray-400">Date</th>
                <th className="p-3 md:p-4 text-left text-xs md:text-sm text-gray-400">Type</th>
                <th className="p-3 md:p-4 text-left text-xs md:text-sm text-gray-400 hidden md:table-cell">Lot Size</th>
                <th className="p-3 md:p-4 text-left text-xs md:text-sm text-gray-400 hidden md:table-cell">Entry Reason</th>
                <th className="p-3 md:p-4 text-left text-xs md:text-sm text-gray-400">Outcome</th>
                <th className="p-3 md:p-4 text-right text-xs md:text-sm text-gray-400">P/L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {pulse.trades?.map((trade) => (
                <tr key={trade.id} className="hover:bg-gray-800/50">
                  <td className="p-3 md:p-4 text-sm md:text-base text-foreground">{trade.date}</td>
                  <td className="p-3 md:p-4 text-sm md:text-base text-foreground">{trade.type}</td>
                  <td className="p-3 md:p-4 text-sm md:text-base text-foreground hidden md:table-cell">{trade.lotSize}</td>
                  <td className="p-3 md:p-4 text-sm md:text-base text-foreground hidden md:table-cell">{trade.entryReason}</td>
                  <td className="p-3 md:p-4 text-sm md:text-base text-foreground">{trade.outcome}</td>
                  <td className="p-3 md:p-4 text-sm md:text-base text-right text-foreground">
                    ${trade.profitLoss.toFixed(2)}
                  </td>
                </tr>
              ))}
              {(!pulse.trades || pulse.trades.length === 0) && (
                <tr>
                  <td colSpan={6} className="p-3 md:p-4 text-center text-sm text-gray-400">
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