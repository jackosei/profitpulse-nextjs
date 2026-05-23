'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Heart } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

const WHY_MIN_CHARS = 30;

interface EditWHYModalProps {
  isOpen: boolean;
  onClose: () => void;
  pulseId: string;
  initialWhyStatement: string;
  initialWhyDiscipline: string;
  onSuccess?: (whyStatement: string, whyDiscipline: string) => void;
}

export default function EditWHYModal({
  isOpen,
  onClose,
  pulseId,
  initialWhyStatement,
  initialWhyDiscipline,
  onSuccess,
}: EditWHYModalProps) {
  const { user } = useAuth();
  const [whyStatement, setWhyStatement]   = useState(initialWhyStatement);
  const [whyDiscipline, setWhyDiscipline] = useState(initialWhyDiscipline);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');

  useEffect(() => {
    if (isOpen) {
      setWhyStatement(initialWhyStatement);
      setWhyDiscipline(initialWhyDiscipline);
      setError('');
    }
  }, [isOpen, initialWhyStatement, initialWhyDiscipline]);

  const isValid =
    whyStatement.trim().length >= WHY_MIN_CHARS &&
    whyDiscipline.trim().length >= WHY_MIN_CHARS;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isValid) return;

    setError('');
    setLoading(true);
    try {
      const { getFirebaseToken } = await import('@/services/firebase/authService');
      const token = await getFirebaseToken();
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/discipline/why', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pulseId,
          whyStatement: whyStatement.trim(),
          whyDiscipline: whyDiscipline.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to save');

      toast.success('WHY statements updated.');
      onSuccess?.(whyStatement.trim(), whyDiscipline.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-lg rounded-xl bg-dark border border-gray-800 shadow-2xl">

          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center">
                <Heart className="w-5 h-5 text-accent" />
              </div>
              <DialogTitle className="text-base font-semibold text-foreground">
                Edit WHY Statements
              </DialogTitle>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Why I trade */}
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                Why I trade
              </label>
              <textarea
                value={whyStatement}
                onChange={e => setWhyStatement(e.target.value)}
                rows={4}
                placeholder="What drives you to trade? What are you working towards?"
                className="w-full p-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:ring-2 focus:ring-accent focus:outline-none resize-none text-sm"
              />
              <p className={`text-xs mt-1 text-right ${whyStatement.trim().length < WHY_MIN_CHARS ? 'text-gray-600' : 'text-gray-500'}`}>
                {whyStatement.trim().length} / {WHY_MIN_CHARS} min
              </p>
            </div>

            {/* Why I follow my rules */}
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                What following my rules means to me
              </label>
              <textarea
                value={whyDiscipline}
                onChange={e => setWhyDiscipline(e.target.value)}
                rows={4}
                placeholder="What does disciplined trading protect or enable for you?"
                className="w-full p-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:ring-2 focus:ring-accent focus:outline-none resize-none text-sm"
              />
              <p className={`text-xs mt-1 text-right ${whyDiscipline.trim().length < WHY_MIN_CHARS ? 'text-gray-600' : 'text-gray-500'}`}>
                {whyDiscipline.trim().length} / {WHY_MIN_CHARS} min
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-900/40 border border-red-800 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isValid || loading}
                className="px-5 py-2 text-sm font-medium bg-accent hover:bg-accent/80 text-white rounded-lg disabled:opacity-50 transition-colors"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
