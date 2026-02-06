'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { DeletePulseModalProps } from '@/types/pulse';
import { usePulse } from '@/hooks/usePulse';

export default function DeletePulseModal({ isOpen, onClose, pulse, onSuccess }: DeletePulseModalProps) {
  const [confirmationName, setConfirmationName] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { deletePulse, loading: apiLoading } = usePulse();
  const isSubmitting = loading || apiLoading;

  // Reset confirmation name when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setConfirmationName('');
    }
  }, [isOpen]);

  const handleDelete = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const success = await deletePulse(pulse.id, user.uid, confirmationName);
      if (!success) {
        throw new Error('Failed to delete pulse');
      }
      
      toast.success('Pulse deleted successfully');
      onSuccess();
      onClose();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to delete pulse');
      }
    } finally {
      setLoading(false);
    }
  };

  const isConfirmationValid = confirmationName.trim() === pulse.name.trim();

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <DialogPanel className="w-full max-w-md rounded-lg bg-dark p-6 border border-gray-800">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-foreground">
                  Delete Pulse
                </DialogTitle>
                <p className="text-sm text-gray-400">
                  This action cannot be undone
                </p>
              </div>
            </div>

            <p className="mb-4 text-gray-300">
              To confirm deletion, please type <span className="font-semibold">{pulse.name}</span>
            </p>

            <input
              type="text"
              value={confirmationName}
              onChange={(e) => setConfirmationName(e.target.value)}
              placeholder="Type pulse name to confirm"
              className="w-full p-3 rounded-lg bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
              disabled={isSubmitting}
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg hover:bg-white/10 text-gray-300"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={!isConfirmationValid || isSubmitting}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 
                <span className="flex items-center justify-center">
                <LoadingSpinner />
                Deleting...
              </span>
                : 'Delete Pulse'}
              </button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
} 