import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react';
import {
  TrashIcon,
  ArchiveBoxIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  ShieldExclamationIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import { formatCurrency } from "@/utils/format"
import { PULSE_STATUS, isPulseLocked } from "@/types/pulse"
import type { Pulse } from "@/types/pulse";

interface PulseHeaderProps {
  name: string;
  instrument?: string;
  accountSize: number;
  createdAt: { seconds: number };
  onArchive: () => void;
  onDelete: () => void;
  onUpdate: () => void;
  maxRiskPerTrade: number;
  maxDailyDrawdown: number;
  maxTotalDrawdown: number;
  status: string;
  ruleViolations?: string[];
  pulse?: Pulse;
}

export default function PulseHeader({
  name,
  instrument = 'N/A',
  accountSize,
  createdAt,
  onArchive,
  onDelete,
  onUpdate,
  maxRiskPerTrade,
  maxDailyDrawdown,
  maxTotalDrawdown,
  status,
  ruleViolations = [],
  pulse,
}: PulseHeaderProps) {
  const isLocked = pulse ? isPulseLocked(pulse) : false;

  const statusConfig = (() => {
    if (isLocked) return { label: 'Locked', color: 'text-red-400 bg-red-500/10 border-red-500/25', icon: <LockClosedIcon className="w-3 h-3" /> };
    switch (status) {
      case PULSE_STATUS.ACTIVE: return { label: 'Active', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25', icon: <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> };
      case PULSE_STATUS.ARCHIVED: return { label: 'Archived', color: 'text-amber-400 bg-amber-500/10 border-amber-500/25', icon: null };
      default: return { label: status, color: 'text-gray-400 bg-gray-500/10 border-gray-500/25', icon: null };
    }
  })();

  return (
    <div className="bg-dark border border-gray-800 rounded-lg overflow-hidden">
      {/* Main identity row */}
      <div className="px-4 md:px-5 pt-4 pb-3 flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2 min-w-0">
          {/* Name + status */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-white tracking-tight truncate">{name}</h1>
            <span className="shrink-0 px-2 py-0.5 text-xs font-medium rounded-full bg-white/[0.08] text-gray-300 border border-gray-700/60">
              {instrument}
            </span>
            <span className={`shrink-0 flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded-full border ${statusConfig.color}`}>
              {statusConfig.icon}
              {statusConfig.label}
            </span>
          </div>

          {/* Risk rules — pill row */}
          <div className="hidden md:flex items-center gap-2">
            <ShieldExclamationIcon className="w-3.5 h-3.5 text-gray-500 shrink-0" />
            <div className="flex items-center gap-1.5">
              <RiskPill label="Risk/Trade" value={`${maxRiskPerTrade}%`} />
              <RiskPill label="Daily DD" value={`${maxDailyDrawdown}%`} />
              <RiskPill label="Total DD" value={`${maxTotalDrawdown}%`} />
            </div>
            <span className="text-[11px] text-gray-600 ml-2">
              · Since {new Date(createdAt.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Account size */}
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Account</p>
            <p className="text-lg font-bold text-white tabular-nums leading-tight">
              {formatCurrency(accountSize)}
            </p>
          </div>

          {/* Actions menu */}
          <Menu as="div" className="relative">
            <MenuButton className="p-2 text-gray-400 hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors">
              <EllipsisVerticalIcon className="w-5 h-5" />
            </MenuButton>
            <MenuItems className="absolute right-0 mt-1 w-48 bg-dark-lighter border border-gray-700/60 rounded-xl shadow-2xl overflow-hidden z-50 py-1">
              <MenuItem>
                {({ active }) => (
                  <button
                    onClick={onUpdate}
                    className={`${active ? 'bg-white/5' : ''} flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-300 hover:text-white`}
                  >
                    <PencilIcon className="w-4 h-4 text-gray-500" />
                    Update Settings
                  </button>
                )}
              </MenuItem>
              <MenuItem>
                {({ active }) => (
                  <button
                    onClick={onArchive}
                    className={`${active ? 'bg-white/5' : ''} flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-300 hover:text-amber-400`}
                  >
                    <ArchiveBoxIcon className="w-4 h-4 text-gray-500" />
                    Archive Pulse
                  </button>
                )}
              </MenuItem>
              <div className="h-px bg-gray-700/40 mx-3 my-1" />
              <MenuItem>
                {({ active }) => (
                  <button
                    onClick={onDelete}
                    className={`${active ? 'bg-red-500/5' : ''} flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-400 hover:text-red-400`}
                  >
                    <TrashIcon className="w-4 h-4" />
                    Delete Pulse
                  </button>
                )}
              </MenuItem>
            </MenuItems>
          </Menu>
        </div>
      </div>

      {/* Mobile risk rules */}
      <div className="md:hidden px-4 pb-3 flex items-center gap-2 flex-wrap border-t border-gray-800/50 pt-2.5">
        <ShieldExclamationIcon className="w-3.5 h-3.5 text-gray-500 shrink-0" />
        <div className="flex items-center gap-1.5">
          <RiskPill label="Risk/Trade" value={`${maxRiskPerTrade}%`} />
          <RiskPill label="Daily DD" value={`${maxDailyDrawdown}%`} />
          <RiskPill label="Total DD" value={`${maxTotalDrawdown}%`} />
        </div>
      </div>

      {/* Lock alert */}
      {isLocked && ruleViolations.length > 0 && (
        <div className="mx-4 md:mx-5 mb-4 rounded-lg px-3 py-2.5 bg-red-500/10 border border-red-500/20 flex items-start gap-2">
          <LockClosedIcon className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-red-400 mb-1">Pulse Locked — Rule Violations</p>
            <ul className="text-xs text-red-400/80 space-y-0.5">
              {ruleViolations.map((v, i) => <li key={i}>• {v}</li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function RiskPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-gray-800/80 border border-gray-700/50 text-gray-400">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-200">{value}</span>
    </span>
  );
}
