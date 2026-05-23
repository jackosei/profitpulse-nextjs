"use client";

import { PlusIcon, LockClosedIcon } from "@heroicons/react/24/outline";

interface AddTradeFABProps {
  onClick: () => void;
  disabled?: boolean;
}

export default function AddTradeFAB({ onClick, disabled }: AddTradeFABProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? "Trading is locked for this pulse" : "Log a new trade"}
      className="fixed bottom-20 right-5 z-40 md:bottom-8 md:right-8 flex items-center gap-2 pl-4 pr-5 py-3 rounded-full shadow-lg font-semibold text-sm transition-all
        bg-accent hover:bg-accent/90 text-white
        disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-none
        focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-dark"
    >
      {disabled
        ? <LockClosedIcon className="w-4 h-4 shrink-0" />
        : <PlusIcon className="w-4 h-4 shrink-0" />
      }
      Log Trade
    </button>
  );
}
