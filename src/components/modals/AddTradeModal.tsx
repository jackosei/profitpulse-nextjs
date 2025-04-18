"use client";

import { useState, useEffect } from 'react';
import type { Pulse, AddTradeModalProps } from '@/types/pulse';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { CheckIcon } from '@heroicons/react/24/outline';
import { TRADING_INSTRUMENTS } from '@/types/tradingInstruments';
import { usePulse } from '@/hooks/usePulse';
import type { TradeCreateData } from '@/services/api/pulseApi';

// Tab options
type TabType = 'trade' | 'psychology' | 'context' | 'reflection';

// Type definitions for select inputs
type EmotionalState = "Calm" | "Excited" | "Fearful" | "Greedy" | "Anxious" | "Confident" | "Other";
type MentalState = "Clear" | "Distracted" | "Tired" | "Focused" | "Rushed" | "Other";
type PlanAdherence = "Fully" | "Partially" | "Deviated";
type MarketCondition = "Trending" | "Ranging" | "Volatile" | "Calm" | "News-driven";
type TradingEnvironment = "Home" | "Office" | "Mobile" | "Other";
type EmotionalImpact = "Positive" | "Negative" | "Neutral";

// Import icons for tabs
import { 
  ArrowTrendingUpIcon, 
  GlobeAltIcon, 
  LightBulbIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

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
  const [activeTab, setActiveTab] = useState<TabType>('trade');
  
  // Enhanced form data
  const [formData, setFormData] = useState({
    // Trade tab
    date: new Date().toISOString().split('T')[0],
    entryTime: '',
    exitTime: '',
    type: 'Buy',
    lotSize: '',
    entryPrice: '',
    exitPrice: '',
    entryReason: '',
    profitLoss: '',
    learnings: '',
    instrument: '',
    entryScreenshot: '',
    exitScreenshot: '',
    
    // Psychology tab
    emotionalState: '',
    emotionalIntensity: 5,
    mentalState: '',
    planAdherence: '',
    impulsiveEntry: false,
    
    // Context tab
    marketCondition: '',
    timeOfDay: '',
    tradingEnvironment: '',
    
    // Reflection tab
    wouldRepeat: false,
    emotionalImpact: '',
    mistakesIdentified: '',
    improvementIdeas: '',
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

  // Handle form field changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Handle checkbox inputs
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } 
    // Handle number inputs
    else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: value }));
    } 
    // Handle all other inputs
    else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
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

    // Validate that entry time is before exit time if both are provided
    if (formData.entryTime && formData.exitTime) {
      const entryTimeValue = formData.entryTime;
      const exitTimeValue = formData.exitTime;
      
      if (entryTimeValue > exitTimeValue) {
        setError('Entry time must be earlier than exit time');
        return false;
      }
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
      // Make this a strict validation error instead of just a warning
      setError('The profit/loss amount doesn\'t match the expected result based on entry/exit prices. For a ' + 
        tradeType + ' trade with entry at ' + entryPrice + ' and exit at ' + exitPrice + 
        ', the P/L should ' + (expectedProfitableDirection ? 'be positive' : 'be negative'));
      return false;
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
      
      // Parse mistakesIdentified as an array
      const mistakesIdentified = formData.mistakesIdentified
        ? formData.mistakesIdentified.split(',').map(m => m.trim())
        : undefined;
      
      const tradeData: TradeCreateData = {
        // Trade data
        date: formData.date,
        entryTime: formData.entryTime || undefined,
        exitTime: formData.exitTime || undefined,
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
        followedRules,
        
        // Screenshots
        entryScreenshot: formData.entryScreenshot || undefined,
        exitScreenshot: formData.exitScreenshot || undefined,
        
        // Psychological factors
        emotionalState: formData.emotionalState ? formData.emotionalState as EmotionalState : undefined,
        emotionalIntensity: formData.emotionalIntensity ? Number(formData.emotionalIntensity) : undefined,
        mentalState: formData.mentalState ? formData.mentalState as MentalState : undefined,
        
        // Decision quality
        planAdherence: formData.planAdherence ? formData.planAdherence as PlanAdherence : undefined,
        impulsiveEntry: formData.impulsiveEntry || undefined,
        
        // Context factors
        marketCondition: formData.marketCondition ? formData.marketCondition as MarketCondition : undefined,
        timeOfDay: formData.timeOfDay || undefined,
        tradingEnvironment: formData.tradingEnvironment ? formData.tradingEnvironment as TradingEnvironment : undefined,
        
        // Reflection
        wouldRepeat: formData.wouldRepeat || undefined,
        emotionalImpact: formData.emotionalImpact ? formData.emotionalImpact as EmotionalImpact : undefined,
        mistakesIdentified,
        improvementIdeas: formData.improvementIdeas || undefined,
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
        entryTime: '',
        exitTime: '',
        type: 'Buy',
        lotSize: '',
        entryPrice: '',
        exitPrice: '',
        entryReason: '',
        profitLoss: '',
        learnings: '',
        instrument: '',
        entryScreenshot: '',
        exitScreenshot: '',
        emotionalState: '',
        emotionalIntensity: 5,
        mentalState: '',
        planAdherence: '',
        impulsiveEntry: false,
        marketCondition: '',
        timeOfDay: '',
        tradingEnvironment: '',
        wouldRepeat: false,
        emotionalImpact: '',
        mistakesIdentified: '',
        improvementIdeas: '',
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

  // Tab Selection Component
  const TabSelector = () => {
    // Determine if tabs have content
    const isTradeComplete = formData.instrument && formData.lotSize && formData.entryPrice && formData.exitPrice && formData.entryReason && formData.profitLoss;
    const isPsychologyComplete = formData.emotionalState || formData.mentalState || formData.planAdherence || formData.impulsiveEntry;
    const isContextComplete = formData.marketCondition || formData.timeOfDay || formData.tradingEnvironment;
    const isReflectionComplete = formData.wouldRepeat || formData.emotionalImpact || formData.mistakesIdentified || formData.improvementIdeas;

  return (
      <div className="flex border-b border-gray-800 mb-6 overflow-x-auto">
        <button
          type="button"
          className={`px-4 py-3 text-sm font-medium flex items-center gap-2 ${
            activeTab === 'trade' 
              ? 'text-blue-500 border-b-2 border-blue-500' 
              : 'text-gray-400 hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('trade')}
        >
          <ArrowTrendingUpIcon className="h-4 w-4" />
          <span>Trade Data</span>
          {isTradeComplete && <CheckCircleIcon className="h-3.5 w-3.5 text-green-500" />}
        </button>
        <button
          type="button"
          className={`px-4 py-3 text-sm font-medium flex items-center gap-2 ${
            activeTab === 'psychology' 
              ? 'text-blue-500 border-b-2 border-blue-500' 
              : 'text-gray-400 hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('psychology')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span>Psychology</span>
          {isPsychologyComplete && <CheckCircleIcon className="h-3.5 w-3.5 text-green-500" />}
        </button>
        <button
          type="button"
          className={`px-4 py-3 text-sm font-medium flex items-center gap-2 ${
            activeTab === 'context' 
              ? 'text-blue-500 border-b-2 border-blue-500' 
              : 'text-gray-400 hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('context')}
        >
          <GlobeAltIcon className="h-4 w-4" />
          <span>Context</span>
          {isContextComplete && <CheckCircleIcon className="h-3.5 w-3.5 text-green-500" />}
        </button>
        <button
          type="button"
          className={`px-4 py-3 text-sm font-medium flex items-center gap-2 ${
            activeTab === 'reflection' 
              ? 'text-blue-500 border-b-2 border-blue-500' 
              : 'text-gray-400 hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('reflection')}
        >
          <LightBulbIcon className="h-4 w-4" />
          <span>Reflection</span>
          {isReflectionComplete && <CheckCircleIcon className="h-3.5 w-3.5 text-green-500" />}
        </button>
      </div>
    );
  };

  // Trade Data Tab Content
  const TradeDataTab = () => (
    <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
          <label className="block text-sm text-gray-400 mb-2">Date <span className="text-red-500">*</span></label>
                        <input
                          type="date"
            name="date"
                          required
            disabled={isSubmitting}
            className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed text-white"
                          value={formData.date}
            onChange={handleInputChange}
                        />
                      </div>

                      <div>
          <label className="block text-sm text-gray-400 mb-2">Instrument <span className="text-red-500">*</span></label>
                        <select
                          required
            name="instrument"
            disabled={isSubmitting || availableInstruments.length === 0}
                          className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed h-[44.5px]"
                          value={formData.instrument}
            onChange={handleInputChange}
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
                      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
          <label className="block text-sm text-gray-400 mb-2">Entry Time / Exit Time</label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="time"
              name="entryTime"
              placeholder="Entry"
              disabled={isSubmitting}
              className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed text-white"
              value={formData.entryTime}
              onChange={handleInputChange}
            />
                        <input
              type="time"
              name="exitTime"
              placeholder="Exit"
              disabled={isSubmitting}
              className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed text-white"
              value={formData.exitTime}
              onChange={handleInputChange}
                        />
                      </div>
                    </div>

                      <div>
          <label className="block text-sm text-gray-400 mb-2">Type / Lot Size <span className="text-red-500">*</span></label>
          <div className="grid grid-cols-2 gap-2">
                        <select
                          required
              name="type"
              disabled={isSubmitting}
                          className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed h-[44.5px]"
                          value={formData.type}
              onChange={handleInputChange}
                        >
                          <option value="Buy">Buy</option>
                          <option value="Sell">Sell</option>
                        </select>
                        <input
                          type="number"
              name="lotSize"
                          required
                          step="0.01"
                          min="0.01"
              placeholder="Lot Size"
              disabled={isSubmitting}
                          className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed"
                          value={formData.lotSize}
              onChange={handleInputChange}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">Entry Price / Exit Price <span className="text-red-500">*</span></label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              name="entryPrice"
              required
              step="0.00001"
              min="0.00001"
              placeholder="Entry"
              disabled={isSubmitting}
              className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed"
              value={formData.entryPrice}
              onChange={handleInputChange}
            />
            <input
              type="number"
              name="exitPrice"
              required
              step="0.00001"
              min="0.00001"
              placeholder="Exit"
              disabled={isSubmitting}
              className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed"
              value={formData.exitPrice}
              onChange={handleInputChange}
            />
          </div>
                      </div>

                      <div>
          <label className="block text-sm text-gray-400 mb-2">Profit/Loss ($) <span className="text-red-500">*</span></label>
          <div className="relative">
                        <input
                          type="number"
              name="profitLoss"
                          required
                          step="0.01"
              disabled={isSubmitting}
              className={`input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed pl-9 ${
                parseFloat(formData.profitLoss) > 0 ? 'border-green-500/50 focus:border-green-500' : 
                parseFloat(formData.profitLoss) < 0 ? 'border-red-500/50 focus:border-red-500' : ''
              }`}
                          value={formData.profitLoss}
              onChange={handleInputChange}
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <span className={`text-lg ${
                parseFloat(formData.profitLoss) > 0 ? 'text-green-500' : 
                parseFloat(formData.profitLoss) < 0 ? 'text-red-500' : 'text-gray-500'
              }`}>
                $
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Enter positive value for profit, negative for loss
          </p>
        </div>
                      </div>

                      <div>
        <label className="block text-sm text-gray-400 mb-2">Entry Reason <span className="text-red-500">*</span></label>
                        <textarea
                          required
          name="entryReason"
          disabled={isSubmitting}
          className="input-dark w-full h-[60px] disabled:opacity-50 disabled:cursor-not-allowed"
                          value={formData.entryReason}
          onChange={handleInputChange}
                        />
                      </div>

      <div className="border-t border-gray-800 pt-4 mt-4">
        <h3 className="text-md font-medium text-foreground mb-3 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
          Trade Screenshots
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Entry Screenshot URL</label>
            <input
              type="text"
              name="entryScreenshot"
              placeholder="Paste image URL here"
              disabled={isSubmitting}
              className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed"
              value={formData.entryScreenshot}
              onChange={handleInputChange}
            />
            <p className="text-xs text-gray-500 mt-1">
              Link to your entry position screenshot
            </p>
                    </div>
                      <div>
            <label className="block text-sm text-gray-400 mb-2">Exit Screenshot URL</label>
            <input
              type="text"
              name="exitScreenshot"
              placeholder="Paste image URL here"
              disabled={isSubmitting}
                          className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed"
              value={formData.exitScreenshot}
              onChange={handleInputChange}
                        />
            <p className="text-xs text-gray-500 mt-1">
              Link to your exit position screenshot
            </p>
          </div>
                      </div>
                    </div>

      <div>
        <label className="block text-sm text-gray-400 mb-2">Notes & Learnings</label>
        <textarea
          name="learnings"
          disabled={isSubmitting}
          className="input-dark w-full h-20 disabled:opacity-50 disabled:cursor-not-allowed"
          value={formData.learnings}
          onChange={handleInputChange}
        />
                        </div>
                        
      {/* Trading Rules Checklist */}
      {pulse?.tradingRules && pulse.tradingRules.length > 0 && (
        <div className="mt-6">
          <h3 className="text-md font-medium text-foreground mb-3 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Trading Rules Checklist
          </h3>
          <div className="space-y-2 border border-gray-800 rounded-lg p-4 bg-gray-900/40">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {pulse.tradingRules.map((rule) => (
                            <div 
                              key={rule.id}
                  className={`flex items-start gap-2 p-2 rounded-md transition-colors ${
                    followedRules.includes(rule.id) ? 'bg-green-900/20 border border-green-800/40' : 'hover:bg-gray-800/50'
                  }`}
                >
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
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-800 text-xs text-gray-400">
              <div>Required rules: {pulse.tradingRules.filter(r => r.isRequired).length}</div>
              <div>
                Checked: {followedRules.length}/{pulse.tradingRules.length}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Psychology Tab Content
  const PsychologyTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">Emotional State</label>
          <select
            name="emotionalState"
            disabled={isSubmitting}
            className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed h-[44.5px]"
            value={formData.emotionalState}
            onChange={handleInputChange}
          >
            <option value="">Select Emotional State</option>
            <option value="Calm">Calm</option>
            <option value="Excited">Excited</option>
            <option value="Fearful">Fearful</option>
            <option value="Greedy">Greedy</option>
            <option value="Anxious">Anxious</option>
            <option value="Confident">Confident</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Mental State</label>
          <select
            name="mentalState"
            disabled={isSubmitting}
            className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed h-[44.5px]"
            value={formData.mentalState}
            onChange={handleInputChange}
          >
            <option value="">Select Mental State</option>
            <option value="Clear">Clear</option>
            <option value="Distracted">Distracted</option>
            <option value="Tired">Tired</option>
            <option value="Focused">Focused</option>
            <option value="Rushed">Rushed</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-2">Emotional Intensity (1-10)</label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            name="emotionalIntensity"
            min="1"
            max="10"
            disabled={isSubmitting}
            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            value={formData.emotionalIntensity}
            onChange={handleInputChange}
          />
          <span className={`text-sm font-medium w-8 text-center rounded-full h-8 flex items-center justify-center
            ${Number(formData.emotionalIntensity) <= 3 ? 'bg-green-500/20 text-green-400' : 
              Number(formData.emotionalIntensity) <= 7 ? 'bg-yellow-500/20 text-yellow-400' : 
              'bg-red-500/20 text-red-400'}`}>
            {formData.emotionalIntensity}
                                  </span>
                                </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Low Intensity</span>
          <span>High Intensity</span>
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-2">Trading Plan Adherence</label>
        <select
          name="planAdherence"
          disabled={isSubmitting}
          className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed h-[44.5px]"
          value={formData.planAdherence}
          onChange={handleInputChange}
        >
          <option value="">Select Plan Adherence</option>
          <option value="Fully">Fully followed my plan</option>
          <option value="Partially">Partially followed my plan</option>
          <option value="Deviated">Deviated from my plan</option>
        </select>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          name="impulsiveEntry"
          id="impulsiveEntry"
          disabled={isSubmitting}
          className="h-4 w-4 rounded border-gray-700 bg-dark text-blue-600 focus:ring-blue-500"
          checked={formData.impulsiveEntry}
          onChange={(e) => setFormData(prev => ({ ...prev, impulsiveEntry: e.target.checked }))}
        />
        <label htmlFor="impulsiveEntry" className="text-sm text-gray-300">
          This was an impulse trade (not planned in advance)
        </label>
      </div>
    </div>
  );

  // Context Tab Content
  const ContextTab = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-400 mb-2">Market Condition</label>
        <select
          name="marketCondition"
          disabled={isSubmitting}
          className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed h-[44.5px]"
          value={formData.marketCondition}
          onChange={handleInputChange}
        >
          <option value="">Select Market Condition</option>
          <option value="Trending">Trending</option>
          <option value="Ranging">Ranging</option>
          <option value="Volatile">Volatile</option>
          <option value="Calm">Calm</option>
          <option value="News-driven">News-driven</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-2">Time of Day</label>
        <select
          name="timeOfDay"
          disabled={isSubmitting}
          className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed h-[44.5px]"
          value={formData.timeOfDay}
          onChange={handleInputChange}
        >
          <option value="">Select Time of Day</option>
          <option value="Early Morning">Early Morning</option>
          <option value="Morning Session">Morning Session</option>
          <option value="Midday">Midday</option>
          <option value="Afternoon Session">Afternoon Session</option>
          <option value="Late Afternoon">Late Afternoon</option>
          <option value="Evening">Evening</option>
          <option value="Overnight">Overnight</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-2">Trading Environment</label>
        <select
          name="tradingEnvironment"
          disabled={isSubmitting}
          className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed h-[44.5px]"
          value={formData.tradingEnvironment}
          onChange={handleInputChange}
        >
          <option value="">Select Environment</option>
          <option value="Home">Home</option>
          <option value="Office">Office</option>
          <option value="Mobile">Mobile</option>
          <option value="Other">Other</option>
        </select>
      </div>
    </div>
  );

  // Reflection Tab Content
  const ReflectionTab = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
                                <input 
                                  type="checkbox"
          name="wouldRepeat"
          id="wouldRepeat"
          disabled={isSubmitting}
          className="h-4 w-4 rounded border-gray-700 bg-dark text-blue-600 focus:ring-blue-500"
          checked={formData.wouldRepeat}
          onChange={(e) => setFormData(prev => ({ ...prev, wouldRepeat: e.target.checked }))}
        />
        <label htmlFor="wouldRepeat" className="text-sm text-gray-300">
          I would make this same trade again
                              </label>
                            </div>

      <div>
        <label className="block text-sm text-gray-400 mb-2">Emotional Impact</label>
        <select
          name="emotionalImpact"
          disabled={isSubmitting}
          className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed h-[44.5px]"
          value={formData.emotionalImpact}
          onChange={handleInputChange}
        >
          <option value="">Select Emotional Impact</option>
          <option value="Positive">Positive - Increased confidence</option>
          <option value="Negative">Negative - Decreased confidence</option>
          <option value="Neutral">Neutral - No significant impact</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-2">Mistakes Identified</label>
        <textarea
          name="mistakesIdentified"
          disabled={isSubmitting}
          className="input-dark w-full h-20 disabled:opacity-50 disabled:cursor-not-allowed"
          value={formData.mistakesIdentified}
          onChange={handleInputChange}
          placeholder="Separate multiple mistakes with commas"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-2">Ideas for Improvement</label>
        <textarea
          name="improvementIdeas"
          disabled={isSubmitting}
          className="input-dark w-full h-20 disabled:opacity-50 disabled:cursor-not-allowed"
          value={formData.improvementIdeas}
          onChange={handleInputChange}
        />
                        </div>
    </div>
  );

  // Render content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'psychology':
        return <PsychologyTab />;
      case 'context':
        return <ContextTab />;
      case 'reflection':
        return <ReflectionTab />;
      default:
        return <TradeDataTab />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-4xl">
          <div className="bg-dark p-4 sm:p-6 rounded-lg border border-gray-800 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">Add Trade to {pulse?.name}</h2>
                <p className="text-sm text-gray-400">Fill in the details about your trade</p>
              </div>
              
              {!loadingPulse && (
                <div className="flex items-center gap-2">
                  <div className="hidden md:flex items-center gap-1.5">
                    <div className={`h-2 w-2 rounded-full ${formData.instrument && formData.entryPrice ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                    <div className={`h-2 w-2 rounded-full ${formData.exitPrice && formData.profitLoss ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                    <div className={`h-2 w-2 rounded-full ${formData.emotionalState || formData.mentalState ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                    <div className={`h-2 w-2 rounded-full ${formData.marketCondition || formData.timeOfDay ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-200 transition-colors"
                    aria-label="Close modal"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                      </div>
                    )}
            </div>
            
            {loadingPulse ? (
              <div className="flex justify-center p-8">
                <LoadingSpinner />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="overflow-y-auto">
                <TabSelector />
                {renderTabContent()}

                      {error && (
                  <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-md">
                    <p className="text-red-400 text-sm flex items-start gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {error}
                    </p>
                        </div>
                      )}

                <div className="mt-6 border-t border-gray-800 pt-4">
                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Form Completion</span>
                      <span className="font-medium">
                        {(() => {
                          // Calculate completion percentage
                          let completed = 0;
                          const total = 4; // Required fields
                          
                          if (formData.instrument) completed++;
                          if (formData.lotSize && Number(formData.lotSize) > 0) completed++;
                          if (formData.entryPrice && formData.exitPrice) completed++;
                          if (formData.profitLoss) completed++;
                          
                          const percentage = Math.round((completed / total) * 100);
                          return `${percentage}%`;
                        })()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                        style={{ 
                          width: (() => {
                            let completed = 0;
                            const total = 4;
                            
                            if (formData.instrument) completed++;
                            if (formData.lotSize && Number(formData.lotSize) > 0) completed++;
                            if (formData.entryPrice && formData.exitPrice) completed++;
                            if (formData.profitLoss) completed++;
                            
                            return `${(completed / total) * 100}%`;
                          })()
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <div>
                      <span className="text-xs text-gray-500">
                        <span className="text-red-500">*</span> Required fields
                      </span>
                      <div className="text-xs text-gray-500 mt-1">
                        Only the Trade Data tab contains required fields. All psychological fields are optional.
                      </div>
                    </div>
                    <div className="flex gap-3">
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