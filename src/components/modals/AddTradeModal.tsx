"use client";

import { useState, useEffect } from 'react';
import { createTrade, calculatePulseStats, getPulse } from '@/services/firestore';
import type { Trade, Pulse, AddTradeModalProps } from '@/types/pulse';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { CheckIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline';
import { TRADING_INSTRUMENTS } from '@/types/tradingInstruments';



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
    learnings: '',
    instrument: ''
  });
  const [error, setError] = useState('');
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [followedRules, setFollowedRules] = useState<string[]>([]);
  const [loadingPulse, setLoadingPulse] = useState(true);
  const [availableInstruments, setAvailableInstruments] = useState<string[]>([]);

  // Fetch pulse data including rules when modal opens
  useEffect(() => {
    if (isOpen && firestoreId) {
      const fetchPulse = async () => {
        setLoadingPulse(true);
        try {
          const pulseData = await getPulse(firestoreId);
          setPulse(pulseData);
          // Initialize followed rules to empty
          setFollowedRules([]);
          
          // Set available instruments from pulse configuration
          if (Array.isArray(pulseData.instruments) && pulseData.instruments.length > 0) {
            setAvailableInstruments(pulseData.instruments);
            // Auto-select first instrument if available
            if (pulseData.instruments.length === 1) {
              setFormData(prev => ({ ...prev, instrument: pulseData.instruments[0] }));
            }
          }
        } catch (error) {
          console.error('Error fetching pulse:', error);
          toast.error('Could not load pulse data');
        } finally {
          setLoadingPulse(false);
        }
      };
      
      fetchPulse();
    }
  }, [isOpen, firestoreId]);

  const toggleRule = (ruleId: string) => {
    setFollowedRules(prev => 
      prev.includes(ruleId) 
        ? prev.filter(id => id !== ruleId) 
        : [...prev, ruleId]
    );
  };

  const validateForm = () => {
    // Check if all required rules are followed
    const requiredRules = pulse?.tradingRules?.filter(rule => rule.isRequired) || [];
    const missingRequiredRules = requiredRules.filter(
      rule => !followedRules.includes(rule.id)
    );
    
    if (missingRequiredRules.length > 0) {
      setError(`Please confirm all required trading rules: ${missingRequiredRules.map(r => r.description).join(', ')}`);
      return false;
    }

    if (!formData.instrument) {
      setError('Please select an instrument');
      return false;
    }

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
    const entryPrice = Number(formData.entryPrice);
    const exitPrice = Number(formData.exitPrice);
    const tradeType = formData.type;

    // Calculate expected profit/loss direction based on prices and trade type
    const priceDifference = exitPrice - entryPrice;
    const expectedProfitableDirection = 
      (tradeType === 'Buy' && priceDifference > 0) || 
      (tradeType === 'Sell' && priceDifference < 0);
    
    // Check if profit/loss sign matches the expected direction
    const isProfitable = profitLoss > 0;
    
    if (expectedProfitableDirection && !isProfitable) {
      setError('Profit/loss amount should be positive for this trade (prices indicate a profitable trade)');
      return false;
    }
    
    if (!expectedProfitableDirection && isProfitable) {
      setError('Profit/loss amount should be negative for this trade (prices indicate a losing trade)');
      return false;
    }

    const maxLossAllowed = (maxRiskPercentage / 100) * accountSize; 

    if (profitLoss < 0 && Math.abs(profitLoss) > maxLossAllowed) {
      setError(`Loss exceeds maximum allowed (${maxRiskPercentage}%) of account size`);
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
        learnings: formData.learnings || '',
        profitLoss,
        profitLossPercentage: (profitLoss / accountSize) * 100,
        outcome,
        pulseId,
        userId,
        instrument: formData.instrument,
        followedRules
      };

      await createTrade(pulseId, firestoreId, tradeData);
      await calculatePulseStats(firestoreId);
      
      // Show success notification with more details
      toast.success('Trade added successfully!', {
        description: `${tradeData.type} trade on ${tradeData.instrument} with P/L of $${tradeData.profitLoss.toFixed(2)}`,
        duration: 4000,
      });
      
      onSuccess?.();
      onClose();
      
      // Reset form data for next time
      setFormData({
        date: new Date().toISOString().split('T')[0],
        type: 'Buy',
        lotSize: '',
        entryPrice: '',
        exitPrice: '',
        entryReason: '',
        profitLoss: '',
        learnings: '',
        instrument: ''
      });
      setFollowedRules([]);
    } catch (error) {
      console.error('Error adding trade:', error);
      setError('Failed to add trade. Please try again.');
      
      // Enhanced error toast
      toast.error('Failed to add trade', {
        description: 'Please try again or check your connection',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Get instrument display name
  const getInstrumentName = (symbol: string) => {
    const instrument = TRADING_INSTRUMENTS.find(i => i.symbol === symbol);
    return instrument ? `${instrument.name} - ${instrument.description}` : symbol;
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50">
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative w-full max-w-4xl">
            <div className="bg-dark p-4 sm:p-6 rounded-lg border border-gray-800 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-foreground mb-4">Add Trade</h2>
              
              {loadingPulse ? (
                <div className="flex justify-center p-8">
                  <LoadingSpinner />
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="overflow-y-auto">
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
                        <label className="block text-sm text-gray-400 mb-2">Instrument</label>
                        <select
                          required
                          disabled={loading || availableInstruments.length === 0}
                          className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed h-[44.5px]"
                          value={formData.instrument}
                          onChange={(e) => setFormData(prev => ({ ...prev, instrument: e.target.value }))}
                        >
                          <option value="">Select Instrument</option>
                          {availableInstruments.map((instrument) => (
                            <option key={instrument} value={instrument}>
                              {getInstrumentName(instrument)}
                            </option>
                          ))}
                        </select>
                        {availableInstruments.length === 0 && (
                          <p className="text-xs text-red-500 mt-1">
                            No instruments configured. Please update pulse settings.
                          </p>
                        )}
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

                    <div className="md:col-span-2">
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

                    {pulse?.tradingRules && pulse.tradingRules.length > 0 && (
                      <div className="md:col-span-2 mt-4 space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                          <ShieldExclamationIcon className="w-4 h-4 text-accent" />
                          <h3 className="text-md font-medium text-foreground">Trading Rules Checklist</h3>
                        </div>
                        
                        <div className="space-y-2 max-h-60 overflow-y-auto p-2 bg-dark-lighter rounded-lg">
                          {pulse.tradingRules.map((rule) => (
                            <div 
                              key={rule.id}
                              className={`p-3 rounded-md border ${
                                followedRules.includes(rule.id) 
                                  ? 'bg-accent/5 border-accent/20' 
                                  : 'bg-dark border-gray-800'
                              } ${
                                rule.isRequired ? 'border-l-2 border-l-accent' : ''
                              }`}
                            >
                              <label className="flex items-start gap-3 cursor-pointer">
                                <div className={`mt-0.5 flex-shrink-0 w-5 h-5 border rounded flex items-center justify-center ${
                                  followedRules.includes(rule.id) 
                                    ? 'bg-accent border-accent' 
                                    : 'border-gray-600'
                                }`}>
                                  {followedRules.includes(rule.id) && (
                                    <CheckIcon className="w-3 h-3 text-white" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <span className="text-sm text-gray-200 font-medium">
                                    {rule.description}
                                    {rule.isRequired && (
                                      <span className="ml-2 text-xs font-medium text-accent">REQUIRED</span>
                                    )}
                                  </span>
                                </div>
                                <input 
                                  type="checkbox"
                                  className="sr-only"
                                  checked={followedRules.includes(rule.id)}
                                  onChange={() => toggleRule(rule.id)}
                                  id={`rule-${rule.id}`}
                                />
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

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
                          {loading ? (
                            <span className="flex items-center justify-center">
                              <LoadingSpinner />
                              Adding...
                            </span>
                          ) : "Add Trade"}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 