"use client";

import LotSizeCalculator from '@/components/features/LotSizeCalculator';
import { Pulse } from '@/types/pulse';
import { useModalEscape } from '@/hooks/useModalEscape';

interface LotSizeCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  pulse?: Pulse;
}

export default function LotSizeCalculatorModal({
  isOpen,
  onClose,
  pulse
}: LotSizeCalculatorModalProps) {
  useModalEscape(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 min-h-[100dvh] w-full overflow-y-auto bg-black/50 !mt-0"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex min-h-[100dvh] w-full items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="lot-size-modal-title"
        >
          <div className="rounded-lg border border-gray-800 bg-dark p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 id="lot-size-modal-title" className="text-xl font-bold text-foreground">
                  Position Size Calculator
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-2xl text-gray-400 hover:text-gray-200"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              
              <LotSizeCalculator pulse={pulse} />
              
              <div className="mt-6 text-sm text-gray-500">
                <p>This calculator helps you determine the appropriate position size based on your risk management parameters.</p>
                {pulse && (
                  <p className="mt-1">Note: Using pulse settings for account size and risk limits.</p>
                )}
              </div>
              
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-error hover:text-error/80"
                >
                  Close
                </button>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}