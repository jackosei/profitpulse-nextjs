"use client";

import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { AlertTriangle } from "lucide-react";
import ViolationHistoryPanel from "@/components/discipline/ViolationHistoryPanel";

interface ViolationHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  pulseId: string;
}

export default function ViolationHistoryModal({ isOpen, onClose, pulseId }: ViolationHistoryModalProps) {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-2xl rounded-2xl bg-[#151f2e] border border-gray-700/60 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
            <DialogTitle className="flex items-center gap-2 text-base font-semibold text-gray-100">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Violation History
            </DialogTitle>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              aria-label="Close"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-5">
            <ViolationHistoryPanel pulseId={pulseId} />
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
