'use client';

import { useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { ArchiveBoxIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface ArchivePulseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  pulseName: string;
  isUnarchiving?: boolean;
}

export default function ArchivePulseModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  pulseName,
  isUnarchiving = false 
}: ArchivePulseModalProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="mx-auto max-w-md rounded-lg bg-dark p-6 border border-gray-800">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
              <ArchiveBoxIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-foreground">
                {isUnarchiving ? 'Unarchive Pulse' : 'Archive Pulse'}
              </DialogTitle>
              <p className="text-sm text-gray-400">
                {isUnarchiving ? 'This pulse will be restored to your dashboard' : 'This pulse will be moved to your archives'}
              </p>
            </div>
          </div>

          <p className="mb-6 text-gray-300">
            Are you sure you want to {isUnarchiving ? 'unarchive' : 'archive'} <span className="font-semibold">{pulseName}</span>?
          </p>

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg hover:bg-white/10 text-gray-300"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className={`px-4 py-2 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed
                ${isUnarchiving ? 'bg-blue-500 hover:bg-blue-600' : 'bg-yellow-600 hover:bg-yellow-700'}`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <LoadingSpinner />
                  <span>{isUnarchiving ? 'Unarchiving...' : 'Archiving...'}</span>
                </span>
              ) : (
                isUnarchiving ? 'Unarchive Pulse' : 'Archive Pulse'
              )}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
} 