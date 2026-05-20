"use client";

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { MAX_RISK_PERCENTAGE, MAX_DAILY_DRAWDOWN, MAX_TOTAL_DRAWDOWN, type Pulse, type TradeRule } from '@/types/pulse';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { v4 as uuidv4 } from 'uuid';
import { usePulse } from '@/hooks/usePulse';
import { getDefaultPointValue } from '@/lib/instrumentPointValues';
import { useModalEscape } from '@/hooks/useModalEscape';

interface UpdatePulseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  pulse: Pulse;
}

export default function UpdatePulseModal({ isOpen, onClose, onSuccess, pulse }: UpdatePulseModalProps) {
  const { user } = useAuth();
  const { updatePulse, loading: apiLoading } = usePulse();
  const [loading, setLoading] = useState(false);
  const isSubmitting = loading || apiLoading;
  const [formData, setFormData] = useState({
    accountSize: (pulse?.accountSize ?? 0).toString(),
    maxRiskPerTrade: (pulse?.maxRiskPerTrade ?? 0).toString(),
    maxDailyDrawdown: (pulse?.maxDailyDrawdown ?? 0).toString(),
    maxTotalDrawdown: (pulse?.maxTotalDrawdown ?? 0).toString(),
    updateReason: ''
  });
  const [instruments, setInstruments] = useState<string[]>(pulse?.instruments ?? []);
  const [instrumentInput, setInstrumentInput] = useState('');
  const [instrumentPointVals, setInstrumentPointVals] = useState<Record<string, number>>(() => {
    // Initialize from existing pulse data or lookup table
    const vals: Record<string, number> = {};
    for (const sym of (pulse?.instruments ?? [])) {
      vals[sym] = pulse?.instrumentPointValues?.[sym] ?? getDefaultPointValue(sym);
    }
    return vals;
  });
  const [tradingRules, setTradingRules] = useState<TradeRule[]>(pulse?.tradingRules || []);
  const [ruleInput, setRuleInput] = useState('');
  const [isRuleRequired, setIsRuleRequired] = useState(false);
  const [partnerEmail, setPartnerEmail] = useState(
    pulse?.discipline?.accountabilityPartnerEmail ?? ''
  );
  const [error, setError] = useState('');

  const handleAddRule = () => {
    const trimmedRule = ruleInput.trim();
    if (trimmedRule) {
      setTradingRules([
        ...tradingRules,
        {
          id: uuidv4(),
          description: trimmedRule,
          isRequired: isRuleRequired
        }
      ]);
      setRuleInput('');
      setIsRuleRequired(false);
    }
  };

  const handleRemoveRule = (ruleId: string) => {
    setTradingRules(tradingRules.filter(rule => rule.id !== ruleId));
  };

  const handleRuleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddRule();
    }
  };

  const handleInstrumentKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddInstrument(instrumentInput);
    }
  };

  const handleAddInstrument = (value: string) => {
    const trimmed = value.trim().toUpperCase();
    if (trimmed && !instruments.includes(trimmed)) {
      setInstruments(prev => [...prev, trimmed]);
      setInstrumentPointVals(prev => ({
        ...prev,
        [trimmed]: getDefaultPointValue(trimmed),
      }));
    }
    setInstrumentInput('');
  };

  const handleRemoveInstrument = (sym: string) => {
    setInstruments(prev => prev.filter(i => i !== sym));
    setInstrumentPointVals(prev => {
      const next = { ...prev };
      delete next[sym];
      return next;
    });
  };

  const handlePointValueChange = (sym: string, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num > 0) {
      setInstrumentPointVals(prev => ({ ...prev, [sym]: num }));
    }
  };

  const validateForm = () => {
    if (!formData.updateReason.trim()) {
      setError('Please provide a reason for the update');
      return false;
    }

    if (formData.updateReason.length < 10) {
      setError('Update reason must be at least 10 characters');
      return false;
    }

    if (Number(formData.maxRiskPerTrade) > MAX_RISK_PERCENTAGE) {
      setError(`Maximum risk per trade cannot exceed ${MAX_RISK_PERCENTAGE}%`);
      return false;
    }

    if (Number(formData.maxDailyDrawdown) > MAX_DAILY_DRAWDOWN) {
      setError(`Maximum daily drawdown cannot exceed ${MAX_DAILY_DRAWDOWN}%`);
      return false;
    }

    if (Number(formData.maxTotalDrawdown) > MAX_TOTAL_DRAWDOWN) {
      setError(`Maximum total drawdown cannot exceed ${MAX_TOTAL_DRAWDOWN}%`);
      return false;
    }

    if (instruments.length === 0) {
      setError('Please provide at least one instrument');
      return false;
    }

    if (partnerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(partnerEmail)) {
      setError('Please enter a valid accountability partner email address');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;
    if (pulse.hasBeenUpdated) {
      setError('This pulse has already been updated once');
      return;
    }

    setLoading(true);

    try {
      if (!user) throw new Error('User not authenticated');

      const updateData = {
        accountSize: Number(formData.accountSize),
        maxRiskPerTrade: Number(formData.maxRiskPerTrade),
        maxDailyDrawdown: Number(formData.maxDailyDrawdown),
        maxTotalDrawdown: Number(formData.maxTotalDrawdown),
        instruments,
        instrumentPointValues: instrumentPointVals,
        tradingRules: tradingRules,
        updateReason: formData.updateReason,
        accountabilityPartnerEmail: partnerEmail.trim() || null,
      };

      const success = await updatePulse(pulse.id, user.uid, updateData);

      if (!success) {
        throw new Error('Failed to update pulse');
      }

      toast.success('Pulse updated successfully!', {
        description: 'The pulse settings have been updated.',
        duration: 4000,
      });

      onSuccess?.();
      onClose();
    } catch (error: Error | unknown) {
      console.error('Error updating pulse:', error);
      setError(error instanceof Error ? error.message : 'Failed to update pulse. Please try again.');

      toast.error('Failed to update pulse', {
        description: error instanceof Error ? error.message : 'Please try again',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = () => {
    if (!isSubmitting) onClose();
  };

  useModalEscape(isOpen && !isSubmitting, handleBackdropClick);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 min-h-[100dvh] w-full overflow-y-auto bg-black/50 !mt-0"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        className="flex min-h-[100dvh] w-full items-center justify-center p-4"
        onClick={handleBackdropClick}
      >
        <div
          className="w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="update-pulse-title"
        >
            <div className="flex max-h-[90vh] flex-col overflow-hidden rounded-lg border border-gray-800 bg-dark">
              <div className="flex shrink-0 items-center justify-between border-b border-gray-800 px-5 py-3 sm:px-6 sm:py-3.5">
                <h2 id="update-pulse-title" className="text-xl font-bold text-foreground">
                  Update Pulse Settings
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="text-2xl text-gray-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="max-h-[calc(90vh-3.5rem)] overflow-y-auto p-5 sm:p-6">
              {pulse.hasBeenUpdated ? (
                <div>
                  <div className="p-4 bg-yellow-900/50 border border-yellow-800 rounded-lg mb-4">
                    <p className="text-yellow-500 text-sm">
                      This pulse has already been updated once. No further updates are allowed.
                    </p>
                    {pulse.lastUpdate && (
                      <div className="mt-2 text-xs text-gray-400">
                        <p>Last updated: {new Date(pulse.lastUpdate.date.seconds * 1000).toLocaleString()}</p>
                        <p>Reason: {pulse.lastUpdate.reason}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Account Size (USD)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        disabled={isSubmitting}
                        className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        value={formData.accountSize}
                        onChange={(e) => setFormData(prev => ({ ...prev, accountSize: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Instruments</label>
                      {/* Instrument tags with point value */}
                      {instruments.length > 0 && (
                        <div className="space-y-2 mb-3">
                          {instruments.map((sym) => (
                            <div key={sym} className="flex items-center gap-2">
                              <span className="bg-gray-800 text-gray-200 px-2 py-1 rounded-md text-sm flex items-center gap-1 min-w-[64px]">
                                {sym}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveInstrument(sym)}
                                  className="ml-1 text-gray-400 hover:text-gray-200"
                                >
                                  ×
                                </button>
                              </span>
                              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                <span>$</span>
                                <input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  value={instrumentPointVals[sym] ?? 1}
                                  onChange={(e) => handlePointValueChange(sym, e.target.value)}
                                  className="input-dark w-20 text-xs py-1 px-2"
                                  title="Dollar value per 1 point/pip per contract"
                                />
                                <span className="text-[10px] text-gray-500">per point/pip</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <input
                        type="text"
                        disabled={isSubmitting}
                        className="input-dark w-full text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                        value={instrumentInput}
                        onChange={(e) => setInstrumentInput(e.target.value)}
                        onKeyDown={handleInstrumentKeyDown}
                        onBlur={() => handleAddInstrument(instrumentInput)}
                        placeholder="Type symbol and press Enter (e.g. NQ, EURUSD, AAPL)"
                      />
                      <p className="text-xs text-gray-500 mt-1">Point/pip values are auto-filled — adjust if your broker differs.</p>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Max Risk Per Trade (%)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        max={MAX_RISK_PERCENTAGE}
                        step="0.01"
                        disabled={isSubmitting}
                        className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        value={formData.maxRiskPerTrade}
                        onChange={(e) => setFormData(prev => ({ ...prev, maxRiskPerTrade: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Max Daily Drawdown (%)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        max={MAX_DAILY_DRAWDOWN}
                        step="0.01"
                        disabled={isSubmitting}
                        className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        value={formData.maxDailyDrawdown}
                        onChange={(e) => setFormData(prev => ({ ...prev, maxDailyDrawdown: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Max Total Drawdown (%)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        max={MAX_TOTAL_DRAWDOWN}
                        step="0.01"
                        disabled={isSubmitting}
                        className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        value={formData.maxTotalDrawdown}
                        onChange={(e) => setFormData(prev => ({ ...prev, maxTotalDrawdown: e.target.value }))}
                      />
                    </div>

                    {/* Trading Rules Section */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Trading Rules</label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {tradingRules.map((rule) => (
                          <div
                            key={rule.id}
                            className={`bg-gray-800 text-gray-200 px-3 py-2 rounded-md text-sm flex items-center justify-between w-full ${rule.isRequired ? 'border-l-2 border-accent' : ''
                              }`}
                          >
                            <div className="flex items-center">
                              {rule.isRequired && (
                                <span className="text-accent text-xs mr-2 font-medium">REQUIRED</span>
                              )}
                              <span>{rule.description}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveRule(rule.id)}
                              className="ml-2 text-gray-400 hover:text-red-500"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="text"
                          disabled={isSubmitting}
                          className="input-dark flex-grow disabled:opacity-50 disabled:cursor-not-allowed"
                          value={ruleInput}
                          onChange={(e) => setRuleInput(e.target.value)}
                          onKeyDown={handleRuleKeyDown}
                          placeholder="E.g., Always check economic calendar before trading"
                        />
                        <button
                          type="button"
                          onClick={handleAddRule}
                          disabled={!ruleInput.trim()}
                          className="p-2 bg-accent hover:bg-accent-hover text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <PlusIcon className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isRuleRequired"
                          checked={isRuleRequired}
                          onChange={(e) => setIsRuleRequired(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-700 text-accent focus:ring-accent"
                        />
                        <label htmlFor="isRuleRequired" className="text-sm text-gray-300">
                          Mark as required rule
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Add rules that you must follow for every trade. Required rules must be checked before adding a trade.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Reason for Update</label>
                      <textarea
                        required
                        disabled={isSubmitting}
                        className="input-dark w-full h-24 disabled:opacity-50 disabled:cursor-not-allowed"
                        value={formData.updateReason}
                        onChange={(e) => setFormData(prev => ({ ...prev, updateReason: e.target.value }))}
                        placeholder="Please provide a detailed reason for updating the pulse settings..."
                      />
                    </div>

                    {/* Accountability Partner */}
                    <div>
                      <label htmlFor="update-partner-email" className="block text-sm text-gray-400 mb-1">
                        Accountability Partner Email
                        <span className="ml-1.5 text-xs text-gray-500">(optional)</span>
                      </label>
                      <input
                        id="update-partner-email"
                        type="email"
                        disabled={isSubmitting}
                        className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        value={partnerEmail}
                        onChange={(e) => setPartnerEmail(e.target.value)}
                        placeholder="partner@email.com"
                        autoComplete="email"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        They will receive an email alert when you hit a drawdown limit or get locked out.
                      </p>
                    </div>

                    {error && (
                      <div className="p-3 bg-red-900/50 border border-red-800 rounded-lg">
                        <p className="text-red-500 text-sm">{error}</p>
                      </div>
                    )}

                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-gray-400 hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <span className="flex items-center justify-center">
                            <LoadingSpinner />
                            Updating...
                          </span>
                        ) : "Update Pulse"}
                      </button>
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