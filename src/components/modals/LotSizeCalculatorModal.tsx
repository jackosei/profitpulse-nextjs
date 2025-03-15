"use client";

import LotSizeCalculator from '@/components/features/LotSizeCalculator';
import { Pulse } from '@/types/pulse';

interface LotSizeCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  pulse: Pulse;
}

export default function LotSizeCalculatorModal({
  isOpen,
  onClose,
  pulse
}: LotSizeCalculatorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50">
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="bg-dark p-6 rounded-lg border border-gray-800">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-foreground">Position Size Calculator</h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-200"
                >
                  &times;
                </button>
              </div>
              
              <LotSizeCalculator pulse={pulse} />
              
              <div className="mt-6 text-sm text-gray-500">
                <p>This calculator helps you determine the appropriate position size based on your pulse&apos;s risk management parameters.</p>
                <p className="mt-1">Note: Always verify calculations and adjust according to your trading strategy.</p>
              </div>
              
              <div className="flex justify-end mt-4">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-400 hover:text-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}