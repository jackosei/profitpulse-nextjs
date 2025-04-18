"use client";

import { useState, useEffect } from 'react';
import type { Pulse, AddTradeModalProps } from '@/types/pulse';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { CheckIcon } from '@heroicons/react/24/outline';
import { TRADING_INSTRUMENTS } from '@/types/tradingInstruments';
import { usePulse } from '@/hooks/usePulse';
import type { TradeCreateData } from '@/services/api/pulseApi';

export default function AddTradeModal({
  isOpen,
  onClose,
  onSuccess,
  pulseId,
  firestoreId,
  userId,
  accountSize
}: AddTradeModalProps) {
  const { getPulseById, createTrade, loading: apiLoading } = usePulse({
    onError: (message) => toast.error(message)
  });
  const [loading, setLoading] = useState(false);
  const isSubmitting = loading || apiLoading;
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

  // Fetch pulse details when modal is opened
  useEffect(() => {
    if (isOpen && pulseId) {
      const fetchPulse = async () => {
        setLoadingPulse(true);
        try {
          const pulseData = await getPulseById(pulseId, userId);
          if (pulseData) {
            setPulse(pulseData);
            setAvailableInstruments(pulseData.instruments || []);
          }
        } catch (err) {
          console.error('Error fetching pulse:', err);
          toast.error('Failed to load pulse details');
        } finally {
          setLoadingPulse(false);
        }
      };
      
      fetchPulse();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, pulseId, userId]);

  const handleRuleToggle = (ruleId: string) => {
    setFollowedRules(prev => {
      return prev.includes(ruleId)
        ? prev.filter(id => id !== ruleId)
        : [...prev, ruleId];
    });
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
    
    if (isProfitable !== expectedProfitableDirection && profitLoss !== 0) {
      // Just a warning, not preventing submission
      toast.warning('The profit/loss amount you entered doesn\'t match the expected result based on entry/exit prices. Please double-check.');
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);

    try {
      const profitLoss = Number(formData.profitLoss);
      const outcome = profitLoss > 0 ? 'Win' as const : profitLoss < 0 ? 'Loss' as const : 'Break-even' as const;
      
      const tradeData: TradeCreateData = {
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

      const response = await createTrade(firestoreId, tradeData);
      
      if (!response) {
        throw new Error('Failed to create trade');
      }
      
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
      setError(error instanceof Error ? error.message : 'Failed to add trade. Please try again.');
      
      // Enhanced error toast
      toast.error('Failed to add trade', {
        description: error instanceof Error ? error.message : 'Please try again or check your connection',
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
                        disabled={isSubmitting}
                        className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        value={formData.date}
                        onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Instrument</label>
                      <select
                        required
                        disabled={isSubmitting || availableInstruments.length === 0}
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
                        disabled={isSubmitting}
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
                        disabled={isSubmitting}
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
                        disabled={isSubmitting}
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
                        disabled={isSubmitting}
                        className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        value={formData.lotSize}
                        onChange={(e) => setFormData(prev => ({ ...prev, lotSize: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Profit/Loss ($)</label>
                      <input
                        type="number"
                        required
                        step="0.01"
                        disabled={isSubmitting}
                        className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        value={formData.profitLoss}
                        onChange={(e) => setFormData(prev => ({ ...prev, profitLoss: e.target.value }))}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Enter positive value for profit, negative for loss
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Entry Reason</label>
                      <textarea
                        required
                        disabled={isSubmitting}
                        className="input-dark w-full h-[44.5px] disabled:opacity-50 disabled:cursor-not-allowed"
                        value={formData.entryReason}
                        onChange={(e) => setFormData(prev => ({ ...prev, entryReason: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm text-gray-400 mb-2">Notes & Learnings</label>
                  <textarea
                    disabled={isSubmitting}
                    className="input-dark w-full h-20 disabled:opacity-50 disabled:cursor-not-allowed"
                    value={formData.learnings}
                    onChange={(e) => setFormData(prev => ({ ...prev, learnings: e.target.value }))}
                  />
                </div>

                {/* Trading Rules Checklist */}
                {pulse?.tradingRules && pulse.tradingRules.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-md font-medium text-foreground mb-3">Trading Rules Checklist</h3>
                    <div className="space-y-2 border border-gray-800 rounded-lg p-3">
                      {pulse.tradingRules.map((rule) => (
                        <div key={rule.id} className="flex items-start gap-2">
                          <button
                            type="button"
                            onClick={() => handleRuleToggle(rule.id)}
                            disabled={isSubmitting}
                            className={`flex-shrink-0 h-5 w-5 mt-0.5 rounded border ${
                              followedRules.includes(rule.id)
                                ? 'bg-emerald-600 border-emerald-600'
                                : 'bg-dark border-gray-700'
                            } flex items-center justify-center`}
                          >
                            {followedRules.includes(rule.id) && <CheckIcon className="h-3 w-3 text-white" />}
                          </button>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm">
                                {rule.description}
                                {rule.isRequired && (
                                  <span className="ml-1 text-red-500 text-xs">*</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {error && <p className="mt-4 text-red-500 text-sm">{error}</p>}

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || availableInstruments.length === 0}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px]"
                  >
                    {isSubmitting ? <LoadingSpinner /> : 'Add Trade'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 