"use client";

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createPulse } from '@/services/firestore';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { MAX_RISK_PERCENTAGE, MAX_DAILY_DRAWDOWN, MAX_TOTAL_DRAWDOWN } from '@/types/pulse';

interface CreatePulseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreatePulseModal({ isOpen, onClose, onSuccess }: CreatePulseModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    instruments: [] as string[],
    accountSize: '',
    maxRiskPerTrade: '',
    maxDailyDrawdown: '',
    maxTotalDrawdown: '',
    note: ''
  });
  const [instrumentInput, setInstrumentInput] = useState('');
  const [error, setError] = useState('');

  const handleAddInstrument = (value: string) => {
    const trimmedValue = value.trim();
    if (trimmedValue && !formData.instruments.includes(trimmedValue)) {
      setFormData(prev => ({
        ...prev,
        instruments: [...prev.instruments, trimmedValue]
      }));
    }
    setInstrumentInput('');
  };

  const handleRemoveInstrument = (instrumentToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      instruments: prev.instruments.filter(instrument => instrument !== instrumentToRemove)
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddInstrument(instrumentInput);
    }
  };

  const validateForm = () => {
    if (formData.name.length < 3) {
      setError('Pulse name must be at least 3 characters');
      return false;
    }
    
    if (!/^[a-zA-Z0-9\s-]+$/.test(formData.name)) {
      setError('Pulse name can only contain letters, numbers, spaces and hyphens');
      return false;
    }

    if (Number(formData.maxRiskPerTrade) > MAX_RISK_PERCENTAGE ) {
      setError(`Maximum risk per trade cannot exceed ${MAX_RISK_PERCENTAGE}%`);
      return false;
    }

    if (Number(formData.maxDailyDrawdown) > MAX_DAILY_DRAWDOWN ) {
      setError(`Maximum daily drawdown cannot exceed ${MAX_DAILY_DRAWDOWN}%`);
      return false;
    }

    if (Number(formData.maxTotalDrawdown) > MAX_TOTAL_DRAWDOWN ) {
      setError(`Maximum total drawdown cannot exceed ${MAX_TOTAL_DRAWDOWN}%`);
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
      if (!user) throw new Error('User not authenticated');

      const pulseData = {
        name: formData.name,
        instruments: formData.instruments,
        accountSize: Number(formData.accountSize),
        maxRiskPerTrade: Number(formData.maxRiskPerTrade),
        maxDailyDrawdown: Number(formData.maxDailyDrawdown),
        maxTotalDrawdown: Number(formData.maxTotalDrawdown),
        userId: user.uid,
        status: 'active' as const,
        note: formData.note
      };

      await createPulse(pulseData);
      
      toast.success('Pulse created successfully!', {
        description: `${pulseData.name} with ${pulseData.accountSize} account size`,
        duration: 4000,
      });
      
      onSuccess?.();
      onClose();
      
      setFormData({
        name: '',
        instruments: [],
        accountSize: '',
        maxRiskPerTrade: '3',
        maxDailyDrawdown: '5',
        maxTotalDrawdown: '20',
        note: ''
      });
    } catch (error: Error | unknown) {
      console.error('Error creating pulse:', error);
      setError(error instanceof Error ? error.message : 'Failed to create pulse. Please try again.');
      
      toast.error('Failed to create pulse', {
        description: error instanceof Error ? error.message : 'Please try again',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-dark p-6 rounded-lg border border-gray-800 w-full max-w-md">
        <h2 className="text-xl font-bold text-foreground mb-4">Create New Pulse</h2>
        
        <form onSubmit={handleSubmit}>
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
              <label className="block text-sm text-gray-400 mb-2">Trading Pairs/Instruments</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.instruments.map((instrument) => (
                  <span
                    key={instrument}
                    className="bg-gray-800 text-gray-200 px-2 py-1 rounded-md text-sm flex items-center"
                  >
                    {instrument}
                    <button
                      type="button"
                      onClick={() => handleRemoveInstrument(instrument)}
                      className="ml-2 text-gray-400 hover:text-gray-200"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                disabled={loading}
                className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed"
                value={instrumentInput}
                onChange={(e) => setInstrumentInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => handleAddInstrument(instrumentInput)}
                placeholder="Type and press Enter or comma to add"
              />
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
                step="0.1"
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
                max="30"
                step="0.1"
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
                max="50"
                step="0.1"
                disabled={loading}
                className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed"
                value={formData.maxTotalDrawdown}
                onChange={(e) => setFormData(prev => ({ ...prev, maxTotalDrawdown: e.target.value }))}
              />
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
                onClick={onClose}
                className="px-4 py-2 text-gray-400 hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    Creating...
                  </span>
                ) : "Create Pulse"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} 