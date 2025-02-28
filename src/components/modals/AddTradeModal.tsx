"use client";

import { useState } from 'react';
import { createTrade, calculatePulseStats } from '@/firebase/firestore';
import type { Trade } from '@/types/pulse';

interface AddTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  pulseId: string;
  firestoreId: string;
  userId: string;
  maxRiskPercentage: number;
  accountSize: number;
}

export default function AddTradeModal({
  isOpen,
  onClose,
  onSuccess,
  pulseId,
  firestoreId,
  userId,
  maxRiskPercentage,
  accountSize
}: AddTradeModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'Buy',
    lotSize: '',
    entryPrice: '',
    exitPrice: '',
    entryReason: '',
    profitLoss: '',
    learnings: ''
  });
  const [error, setError] = useState('');

  const calculateProfitLoss = (type: string, entryPrice: number, exitPrice: number, lotSize: number) => {
    const priceDiff = exitPrice - entryPrice;
    const multiplier = type === 'Buy' ? 1 : -1;
    return priceDiff * multiplier * lotSize;
  };

  const validateForm = () => {
    if (!formData.lotSize || Number(formData.lotSize) <= 0) {
      setError('Please enter a valid lot size');
      return false;
    }

    if (!formData.entryPrice || Number(formData.entryPrice) <= 0) {
      setError('Please enter a valid entry price');
      return false;
    }

    if (!formData.exitPrice || Number(formData.exitPrice) <= 0) {
      setError('Please enter a valid exit price');
      return false;
    }

    if (!formData.entryReason) {
      setError('Please provide an entry reason');
      return false;
    }

    if (!formData.profitLoss || isNaN(Number(formData.profitLoss))) {
      setError('Please enter the actual profit/loss amount');
      return false;
    }

    const profitLoss = Number(formData.profitLoss);

    // Calculate risk percentage
    const risk = Math.abs(profitLoss) / accountSize * 100;
    if (risk > maxRiskPercentage) {
      setError(`Risk exceeds maximum allowed (${maxRiskPercentage}%)`);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      const profitLoss = Number(formData.profitLoss);
      const outcome = profitLoss > 0 ? 'Win' : profitLoss < 0 ? 'Loss' : 'Break-even';
      
      const tradeData: Omit<Trade, 'id' | 'createdAt'> = {
        date: formData.date,
        type: formData.type as 'Buy' | 'Sell',
        lotSize: Number(formData.lotSize),
        entryPrice: Number(formData.entryPrice),
        exitPrice: Number(formData.exitPrice),
        entryReason: formData.entryReason,
        learnings: formData.learnings || undefined,
        profitLoss,
        profitLossPercentage: (profitLoss / accountSize) * 100,
        outcome,
        pulseId,
        userId,
        instrument: ''
      };

      await createTrade(pulseId, firestoreId, tradeData);
      await calculatePulseStats(firestoreId);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error adding trade:', error);
      setError('Failed to add trade. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-dark p-6 rounded-lg border border-gray-800 w-full max-w-4xl">
        <h2 className="text-xl font-bold text-foreground mb-4">Add Trade</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Date</label>
                <input
                  type="date"
                  required
                  disabled={loading}
                  className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Entry Price</label>
                <input
                  type="number"
                  required
                  step="0.00001"
                  min="0.00001"
                  disabled={loading}
                  className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  value={formData.entryPrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, entryPrice: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Exit Price</label>
                <input
                  type="number"
                  required
                  step="0.00001"
                  min="0.00001"
                  disabled={loading}
                  className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  value={formData.exitPrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, exitPrice: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Entry Reason</label>
                <textarea
                  required
                  disabled={loading}
                  rows={3}
                  className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  value={formData.entryReason}
                  onChange={(e) => setFormData(prev => ({ ...prev, entryReason: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-4">
            <div>
                <label className="block text-sm text-gray-400 mb-2">Type</label>
                <select
                  required
                  disabled={loading}
                  className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed h-[44.5px]"
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                >
                  <option value="Buy">Buy</option>
                  <option value="Sell">Sell</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Lot Size</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0.01"
                  disabled={loading}
                  className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  value={formData.lotSize}
                  onChange={(e) => setFormData(prev => ({ ...prev, lotSize: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Actual Profit/Loss (USD)</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  disabled={loading}
                  className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  value={formData.profitLoss}
                  onChange={(e) => setFormData(prev => ({ ...prev, profitLoss: e.target.value }))}
                />
              </div>

              

              <div>
                <label className="block text-sm text-gray-400 mb-2">Learnings (Optional)</label>
                <textarea
                  disabled={loading}
                  rows={3}
                  className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  value={formData.learnings}
                  onChange={(e) => setFormData(prev => ({ ...prev, learnings: e.target.value }))}
                  placeholder="What did you learn from this trade?"
                />
              </div>
            </div>

            <div className="md:col-span-2 space-y-4">
              {error && (
                <div className="p-3 bg-red-900/50 border border-red-800 rounded-lg">
                  <p className="text-red-500 text-sm">{error}</p>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-400 hover:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Adding..." : "Add Trade"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} 