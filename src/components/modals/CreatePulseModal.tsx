"use client";

import { useState } from 'react';
import { useModalEscape } from '@/hooks/useModalEscape';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { MAX_RISK_PERCENTAGE, MAX_DAILY_DRAWDOWN, MAX_TOTAL_DRAWDOWN } from '@/types/pulse';
import { PlusIcon, TrashIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { v4 as uuidv4 } from 'uuid';
import { usePulse } from '@/hooks/usePulse';
import { TradeRule } from '@/types/pulse';
import { getDefaultPointValue } from '@/lib/instrumentPointValues';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WHY_MIN_CHARS = 30;

type Step = 'config' | 'why';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CreatePulseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CreatePulseModal({ isOpen, onClose, onSuccess }: CreatePulseModalProps) {
  const { user } = useAuth();
  const { createPulse, loading } = usePulse();

  // --- Step state ---
  const [step, setStep] = useState<Step>('config');

  // --- Config step state ---
  const [formData, setFormData] = useState({
    name: '',
    instruments: [] as string[],
    accountSize: '',
    maxRiskPerTrade: '',
    maxDailyDrawdown: '',
    maxTotalDrawdown: '',
    note: ''
  });
  const [instrumentPointValues, setInstrumentPointValues] = useState<Record<string, number>>({});
  const [tradingRules, setTradingRules] = useState<TradeRule[]>([]);
  const [ruleInput, setRuleInput] = useState('');
  const [isRuleRequired, setIsRuleRequired] = useState(false);
  const [instrumentInput, setInstrumentInput] = useState('');

  // --- WHY step state ---
  const [whyStatement, setWhyStatement] = useState('');
  const [whyDiscipline, setWhyDiscipline] = useState('');
  const [whyTouched, setWhyTouched] = useState({ statement: false, discipline: false });

  // --- Shared state ---
  const [error, setError] = useState('');

  // =========================================================================
  // Config step handlers (unchanged from original)
  // =========================================================================

  const handleAddInstrument = (value: string) => {
    const trimmedValue = value.trim().toUpperCase();
    if (trimmedValue && !formData.instruments.includes(trimmedValue)) {
      setFormData(prev => ({
        ...prev,
        instruments: [...prev.instruments, trimmedValue]
      }));
      // Pre-populate point value from lookup table
      setInstrumentPointValues(prev => ({
        ...prev,
        [trimmedValue]: getDefaultPointValue(trimmedValue),
      }));
    }
    setInstrumentInput('');
  };

  const handleRemoveInstrument = (instrumentToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      instruments: prev.instruments.filter(instrument => instrument !== instrumentToRemove)
    }));
    setInstrumentPointValues(prev => {
      const next = { ...prev };
      delete next[instrumentToRemove];
      return next;
    });
  };

  const handlePointValueChange = (symbol: string, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num > 0) {
      setInstrumentPointValues(prev => ({ ...prev, [symbol]: num }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddInstrument(instrumentInput);
    }
  };

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

  // =========================================================================
  // Validation
  // =========================================================================

  const validateConfig = () => {
    if (formData.name.length < 3) {
      setError('Pulse name must be at least 3 characters');
      return false;
    }

    if (!/^[a-zA-Z0-9\s-]+$/.test(formData.name)) {
      setError('Pulse name can only contain letters, numbers, spaces and hyphens');
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

    return true;
  };

  const isWhyValid =
    whyStatement.trim().length >= WHY_MIN_CHARS &&
    whyDiscipline.trim().length >= WHY_MIN_CHARS;

  // =========================================================================
  // Navigation between steps
  // =========================================================================

  const handleAdvanceToWhy = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validateConfig()) return;
    setStep('why');
  };

  const handleBackToConfig = () => {
    setError('');
    setStep('config');
  };

  // =========================================================================
  // Submit (only from WHY step)
  // =========================================================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isWhyValid) {
      setError('Please complete both WHY fields (minimum 30 characters each)');
      return;
    }

    try {
      if (!user) throw new Error('User not authenticated');

      const pulseData = {
        name: formData.name,
        instruments: formData.instruments,
        instrumentPointValues,
        accountSize: Number(formData.accountSize),
        maxRiskPerTrade: Number(formData.maxRiskPerTrade),
        maxDailyDrawdown: Number(formData.maxDailyDrawdown),
        maxTotalDrawdown: Number(formData.maxTotalDrawdown),
        tradingRules: tradingRules,
        note: formData.note,
        userId: user.uid,
        whyStatement: whyStatement.trim(),
        whyDiscipline: whyDiscipline.trim(),
      };

      const response = await createPulse(pulseData);

      if (!response) {
        throw new Error('Failed to create pulse');
      }

      toast.success('Pulse created successfully!', {
        description: `${pulseData.name} with ${pulseData.accountSize} account size`,
        duration: 4000,
      });

      onSuccess?.();
      onClose();

      // Reset all state
      setFormData({
        name: '',
        instruments: [],
        accountSize: '',
        maxRiskPerTrade: '3',
        maxDailyDrawdown: '5',
        maxTotalDrawdown: '20',
        note: ''
      });
      setInstrumentPointValues({});
      setTradingRules([]);
      setWhyStatement('');
      setWhyDiscipline('');
      setWhyTouched({ statement: false, discipline: false });
      setStep('config');
    } catch (error: unknown) {
      console.error('Error creating pulse:', error);
      setError(error instanceof Error ? error.message : 'Failed to create pulse. Please try again.');

      toast.error('Failed to create pulse', {
        description: error instanceof Error ? error.message : 'Please try again',
        duration: 5000,
      });
    }
  };

  // =========================================================================
  // Close handler — resets step
  // =========================================================================

  const handleClose = () => {
    setStep('config');
    setError('');
    onClose();
  };

  useModalEscape(isOpen && !loading, handleClose);

  if (!isOpen) return null;

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div
      className="fixed inset-0 z-50 min-h-[100dvh] w-full overflow-y-auto bg-black/50 !mt-0"
      onClick={handleClose}
      role="presentation"
    >
      <div
        className="flex min-h-[100dvh] w-full items-center justify-center p-4"
        onClick={handleClose}
      >
        <div
          className="w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-pulse-title"
        >
          <div className="max-h-[90vh] overflow-y-auto rounded-lg border border-gray-800 bg-dark p-6">
            {/* ── Step indicator + close ── */}
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {step === 'why' && (
                  <button
                    type="button"
                    onClick={handleBackToConfig}
                    className="shrink-0 rounded p-1 text-gray-400 transition-colors hover:text-white"
                    aria-label="Back to configuration"
                  >
                    <ArrowLeftIcon className="h-5 w-5" />
                  </button>
                )}
                <div className="min-w-0 flex-1">
                  <h2 id="create-pulse-title" className="text-xl font-bold text-foreground">
                    {step === 'config' ? 'Create New Pulse' : 'Your WHY'}
                  </h2>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        step === 'config' ? 'bg-accent' : 'bg-accent/40'
                      }`}
                    />
                    <div
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        step === 'why' ? 'bg-accent' : 'bg-gray-700'
                      }`}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Step {step === 'config' ? '1' : '2'} of 2
                    {step === 'config' ? ' — Configuration' : ' — Discipline commitment'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="shrink-0 text-2xl text-gray-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

              {/* ════════════════════════════════════════════════════════════ */}
              {/* STEP 1: Config (original form)                              */}
              {/* ════════════════════════════════════════════════════════════ */}
              {step === 'config' && (
                <form onSubmit={handleAdvanceToWhy}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Pulse Name</label>
                      <input
                        type="text"
                        required
                        disabled={loading}
                        className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Instruments</label>
                      {/* Added instruments with point value */}
                      {formData.instruments.length > 0 && (
                        <div className="space-y-2 mb-3">
                          {formData.instruments.map((instrument) => (
                            <div key={instrument} className="flex items-center gap-2">
                              <span className="bg-gray-800 text-gray-200 px-2 py-1 rounded-md text-sm flex items-center gap-1 min-w-[64px]">
                                {instrument}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveInstrument(instrument)}
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
                                  value={instrumentPointValues[instrument] ?? 1}
                                  onChange={(e) => handlePointValueChange(instrument, e.target.value)}
                                  className="input-dark w-20 text-xs py-1 px-2"
                                  title="Dollar value per 1 point/pip per contract"
                                />
                                <span className="text-gray-500">per point/pip</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <input
                        type="text"
                        disabled={loading}
                        className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        value={instrumentInput}
                        onChange={(e) => setInstrumentInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={() => handleAddInstrument(instrumentInput)}
                        placeholder="Type symbol and press Enter (e.g. NQ, EURUSD, AAPL)"
                      />
                      <p className="text-xs text-gray-500 mt-1">Point/pip values are auto-filled — adjust if your broker differs.</p>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Account Size (USD)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        disabled={loading}
                        className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        value={formData.accountSize}
                        onChange={(e) => setFormData(prev => ({ ...prev, accountSize: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Max Risk Per Trade (%)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        max="10"
                        step="0.01"
                        disabled={loading}
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
                        disabled={loading}
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
                        disabled={loading}
                        className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        value={formData.maxTotalDrawdown}
                        onChange={(e) => setFormData(prev => ({ ...prev, maxTotalDrawdown: e.target.value }))}
                      />
                    </div>

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
                          disabled={loading}
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
                      <label className="block text-sm text-gray-400 mb-2">Note (Optional)</label>
                      <textarea
                        disabled={loading}
                        className="input-dark w-full h-24 disabled:opacity-50 disabled:cursor-not-allowed"
                        value={formData.note}
                        onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                        placeholder="Add any additional notes about this pulse..."
                      />
                    </div>

                    {error && (
                      <div className="p-3 bg-red-900/50 border border-red-800 rounded-lg">
                        <p className="text-red-500 text-sm">{error}</p>
                      </div>
                    )}

                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={handleClose}
                        className="px-4 py-2 text-gray-400 hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* ════════════════════════════════════════════════════════════ */}
              {/* STEP 2: WHY (non-skippable)                                */}
              {/* ════════════════════════════════════════════════════════════ */}
              {step === 'why' && (
                <form onSubmit={handleSubmit}>
                  <div className="space-y-5">
                    {/* Context blurb */}
                    <div className="p-3 bg-accent/10 border border-accent/20 rounded-lg">
                      <p className="text-sm text-gray-300 leading-relaxed">
                        Before your Pulse goes live, take a moment to anchor yourself.
                        Your answers here will be shown to you when discipline slips —
                        make them personal and honest.
                      </p>
                    </div>

                    {/* Field 1: whyStatement */}
                    <div>
                      <label
                        htmlFor="whyStatement"
                        className="block text-sm font-medium text-gray-300 mb-1.5"
                      >
                        What is driving you to trade?
                      </label>
                      <p className="text-xs text-gray-500 mb-2">
                        Be specific about what success means for you.
                      </p>
                      <textarea
                        id="whyStatement"
                        disabled={loading}
                        className={`input-dark w-full h-28 disabled:opacity-50 disabled:cursor-not-allowed resize-none ${whyTouched.statement && whyStatement.trim().length < WHY_MIN_CHARS
                          ? 'border-red-500/50 focus:border-red-500'
                          : whyStatement.trim().length >= WHY_MIN_CHARS
                            ? 'border-emerald-500/30 focus:border-emerald-500'
                            : ''
                          }`}
                        value={whyStatement}
                        onChange={(e) => setWhyStatement(e.target.value)}
                        onBlur={() => setWhyTouched(prev => ({ ...prev, statement: true }))}
                        placeholder="e.g. I trade to build financial freedom for my family. Success means consistent monthly returns that replace my salary within 2 years..."
                      />
                      <div className="flex items-center justify-between mt-1">
                        {whyTouched.statement && whyStatement.trim().length < WHY_MIN_CHARS ? (
                          <p className="text-xs text-red-400">
                            Minimum {WHY_MIN_CHARS} characters required
                          </p>
                        ) : (
                          <span />
                        )}
                        <span className={`text-xs tabular-nums ${whyStatement.trim().length >= WHY_MIN_CHARS
                          ? 'text-emerald-400'
                          : 'text-gray-500'
                          }`}>
                          {whyStatement.trim().length}/{WHY_MIN_CHARS}
                        </span>
                      </div>
                    </div>

                    {/* Field 2: whyDiscipline */}
                    <div>
                      <label
                        htmlFor="whyDiscipline"
                        className="block text-sm font-medium text-gray-300 mb-1.5"
                      >
                        What does following your rules mean for your trading?
                      </label>
                      <p className="text-xs text-gray-500 mb-2">
                        What are you protecting?
                      </p>
                      <textarea
                        id="whyDiscipline"
                        disabled={loading}
                        className={`input-dark w-full h-28 disabled:opacity-50 disabled:cursor-not-allowed resize-none ${whyTouched.discipline && whyDiscipline.trim().length < WHY_MIN_CHARS
                          ? 'border-red-500/50 focus:border-red-500'
                          : whyDiscipline.trim().length >= WHY_MIN_CHARS
                            ? 'border-emerald-500/30 focus:border-emerald-500'
                            : ''
                          }`}
                        value={whyDiscipline}
                        onChange={(e) => setWhyDiscipline(e.target.value)}
                        onBlur={() => setWhyTouched(prev => ({ ...prev, discipline: true }))}
                        placeholder="e.g. Following my rules protects my capital and my confidence. Every deviation costs me money and mental energy I can't afford to waste..."
                      />
                      <div className="flex items-center justify-between mt-1">
                        {whyTouched.discipline && whyDiscipline.trim().length < WHY_MIN_CHARS ? (
                          <p className="text-xs text-red-400">
                            Minimum {WHY_MIN_CHARS} characters required
                          </p>
                        ) : (
                          <span />
                        )}
                        <span className={`text-xs tabular-nums ${whyDiscipline.trim().length >= WHY_MIN_CHARS
                          ? 'text-emerald-400'
                          : 'text-gray-500'
                          }`}>
                          {whyDiscipline.trim().length}/{WHY_MIN_CHARS}
                        </span>
                      </div>
                    </div>

                    {error && (
                      <div className="p-3 bg-red-900/50 border border-red-800 rounded-lg">
                        <p className="text-red-500 text-sm">{error}</p>
                      </div>
                    )}

                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={handleBackToConfig}
                        disabled={loading}
                        className="px-4 py-2 text-gray-400 hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={loading || !isWhyValid}
                        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <span className="flex items-center justify-center">
                            <LoadingSpinner />
                            Creating...
                          </span>
                        ) : "Create Pulse"}
                      </button>
                    </div>
                  </div>
                </form>
              )}

          </div>
        </div>
      </div>
    </div>
  );
} 