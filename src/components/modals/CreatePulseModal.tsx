"use client";

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createPulse } from '@/services/firestore';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

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
    instrument: '',
    accountSize: '',
    maxRiskPerTrade: '',
    maxLossPerDay: '',
    maxLossPerWeek: '',
    maxRiskPerDay: ''
  });
  const [error, setError] = useState('');

  const validateForm = () => {
    if (formData.name.length < 3) {
      setError('Pulse name must be at least 3 characters');
      return false;
    }
    
    if (!/^[a-zA-Z0-9\s-]+$/.test(formData.name)) {
      setError('Pulse name can only contain letters, numbers, spaces and hyphens');
      return false;
    }

    if (Number(formData.maxRiskPerTrade) > 3) {
      setError('Maximum risk per trade cannot exceed 3%');
      return false;
    }

    if (Number(formData.maxLossPerDay) > 5) {
      setError('Maximum loss per day cannot exceed 5%');
      return false;
    }

    if (Number(formData.maxLossPerWeek) > 10) {
      setError('Maximum loss per week cannot exceed 10%');
      return false;
    }

    if (Number(formData.maxRiskPerDay) > 9) {
      setError('Maximum risk per day cannot exceed 9%');
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
        instrument: formData.instrument,
        accountSize: Number(formData.accountSize),
        maxRiskPerTrade: Number(formData.maxRiskPerTrade),
        maxLossPerDay: Number(formData.maxLossPerDay),
        maxLossPerWeek: Number(formData.maxLossPerWeek),
        maxRiskPerDay: Number(formData.maxRiskPerDay),
        userId: user.uid,
        status: 'active' as const
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
        instrument: '',
        accountSize: '',
        maxRiskPerTrade: '3',
        maxLossPerDay: '5',
        maxLossPerWeek: '10',
        maxRiskPerDay: '9'
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
              <label className="block text-sm text-gray-400 mb-2">Trading Pair/Instrument</label>
              <input
                type="text"
                required
                disabled={loading}
                className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed"
                value={formData.instrument}
                onChange={(e) => setFormData(prev => ({ ...prev, instrument: e.target.value }))}
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
                max="3"
                step="0.1"
                disabled={loading}
                className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed"
                value={formData.maxRiskPerTrade}
                onChange={(e) => setFormData(prev => ({ ...prev, maxRiskPerTrade: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Max Loss Per Day (%)</label>
              <input
                type="number"
                required
                min="0"
                max="5"
                step="0.1"
                disabled={loading}
                className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed"
                value={formData.maxLossPerDay}
                onChange={(e) => setFormData(prev => ({ ...prev, maxLossPerDay: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Max Loss Per Week (%)</label>
              <input
                type="number"
                required
                min="0"
                max="10"
                step="0.1"
                disabled={loading}
                className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed"
                value={formData.maxLossPerWeek}
                onChange={(e) => setFormData(prev => ({ ...prev, maxLossPerWeek: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Max Risk Per Day (%)</label>
              <input
                type="number"
                required
                min="0"
                max="9"
                step="0.1"
                disabled={loading}
                className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed"
                value={formData.maxRiskPerDay}
                onChange={(e) => setFormData(prev => ({ ...prev, maxRiskPerDay: e.target.value }))}
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