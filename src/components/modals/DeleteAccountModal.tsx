'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import LoadingSpinner from '../LoadingSpinner';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DeleteAccountModal({ isOpen, onClose }: DeleteAccountModalProps) {
  const [confirmationText, setConfirmationText] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // Reset confirmation text when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setConfirmationText('');
    }
  }, [isOpen]);

  const handleDelete = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      await user.delete();
      toast.success('Account deleted successfully');
      onClose();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to delete account');
      }
    } finally {
      setLoading(false);
    }
  };

  const isConfirmationValid = confirmationText.toLowerCase() === 'delete my account';

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="mx-auto max-w-md rounded-lg bg-dark p-6 border border-gray-800">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-foreground">
                Delete Account
              </DialogTitle>
              <p className="text-sm text-gray-400">
                This action cannot be undone
              </p>
            </div>
          </div>

          <div className="mb-6 space-y-4">
            <p className="text-gray-300">
              Deleting your account will:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-400 space-y-2">
              <li>Permanently delete all your pulses and trading data</li>
              <li>Remove all your personal information</li>
              <li>Cancel any active subscriptions</li>
            </ul>
          </div>

          <p className="mb-4 text-gray-300">
            To confirm deletion, please type <span className="font-semibold">delete my account</span>
          </p>

          <input
            type="text"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            placeholder="Type 'delete my account' to confirm"
            className="w-full p-3 rounded-lg bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
          />

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg hover:bg-white/10 text-gray-300"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={!isConfirmationValid || loading}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 
                <span className="flex items-center justify-center gap-2">
                  <LoadingSpinner />
                  <span>Deleting...</span>
                </span>
                : 'Delete Account'
              }
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
} 