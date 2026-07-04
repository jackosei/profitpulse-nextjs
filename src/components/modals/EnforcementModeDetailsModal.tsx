"use client";

import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Shield, Zap, RotateCcw, Clock } from "lucide-react";

interface EnforcementModeDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Side-by-side comparison of the two enforcement modes a trader can choose
 * when creating (or updating) a pulse. Opened from CreatePulseModal /
 * UpdatePulseModal via a "Learn more" link.
 */
export default function EnforcementModeDetailsModal({ isOpen, onClose }: EnforcementModeDetailsModalProps) {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-[60]">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-3xl rounded-2xl bg-[#151f2e] border border-gray-700/60 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
            <DialogTitle className="flex items-center gap-2 text-base font-semibold text-gray-100">
              <Shield className="w-4 h-4 text-blue-400" />
              Choose your enforcement style
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

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <p className="text-sm text-gray-400 leading-relaxed">
              ProfitPulse&apos;s discipline engine escalates constraints (risk caps, no-trade days)
              through a four-tier ladder. You pick which signal triggers tier transitions on this pulse.
              You can change this later, but the choice should reflect how you want to recover from bad weeks.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* SCORE_BASED */}
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/[0.04] p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-bold text-blue-300">Score-based <span className="text-[10px] uppercase tracking-wider text-blue-400/70 ml-1">Recommended</span></h3>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Tier is driven by your live discipline score (0–100). The score recovers via clean
                  sessions, full journal entries, following all required rules, and streaks.
                </p>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Tier thresholds</p>
                  <div className="text-xs text-gray-300 space-y-0.5 font-mono">
                    <div>Score ≥ 85 — <span className="text-emerald-400">Tier 1</span> · no constraint</div>
                    <div>Score 70–84 — <span className="text-amber-400">Tier 2</span> · 75% risk cap</div>
                    <div>Score 55–69 — <span className="text-amber-400">Tier 3</span> · 50% cap + NTD warning</div>
                    <div>Score 40–54 — <span className="text-red-400">Tier 4</span> · NTD + 50% cap</div>
                    <div>Score &lt; 40 — <span className="text-red-400">Tier 5</span> · extended NTD</div>
                  </div>
                </div>
                <div className="flex items-start gap-1.5 text-[11px] text-blue-300 bg-blue-500/10 rounded-md px-2.5 py-1.5">
                  <RotateCcw className="w-3 h-3 mt-0.5 shrink-0" />
                  <span><span className="font-semibold">Recovery:</span> action-based. You earn your way back by logging clean sessions.</span>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  <span className="font-semibold text-gray-400">Best for:</span> traders who want discipline built through consistent
                  positive action, and who don&apos;t want a bad week to be erased by simply waiting it out.
                </p>
              </div>

              {/* SEVERITY_BASED */}
              <div className="rounded-xl border border-purple-500/30 bg-purple-500/[0.04] p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-bold text-purple-300">Severity-based</h3>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Tier is driven by your cumulative violation severity for the current week. Monday
                  rolls in a fresh slate — severity resets to zero.
                </p>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Tier thresholds (weekly severity)</p>
                  <div className="text-xs text-gray-300 space-y-0.5 font-mono">
                    <div>0–4 — <span className="text-emerald-400">Tier 1</span> · no constraint</div>
                    <div>5–14 — <span className="text-amber-400">Tier 2</span> · 75% risk cap</div>
                    <div>15–24 — <span className="text-amber-400">Tier 3</span> · 50% cap + NTD warning</div>
                    <div>25–39 — <span className="text-red-400">Tier 4</span> · NTD + 50% cap</div>
                    <div>40+ — <span className="text-red-400">Tier 5</span> · extended NTD</div>
                  </div>
                </div>
                <div className="flex items-start gap-1.5 text-[11px] text-purple-300 bg-purple-500/10 rounded-md px-2.5 py-1.5">
                  <Clock className="w-3 h-3 mt-0.5 shrink-0" />
                  <span><span className="font-semibold">Recovery:</span> time-based. Monday clears last week&apos;s severity totals.</span>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  <span className="font-semibold text-gray-400">Best for:</span> traders who want a fresh weekly slate regardless of
                  behaviour, and who recover better psychologically from a clean Monday reset.
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-gray-700/60 bg-dark/40 p-4 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">What stays the same in both modes</p>
              <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
                <li>Tier outcomes (75% cap → 50% cap + warning → NTD + 50% cap) and clean-sessions-to-lift counts.</li>
                <li>Reflection gate on daily drawdown breaches.</li>
                <li>Permanent lockout on total drawdown breaches.</li>
                <li>Score amplification in YELLOW / RED zones.</li>
                <li>WHY reminder on your first risk breach of the week.</li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-gray-800 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/30 hover:bg-blue-500/25 transition-colors"
            >
              Got it
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
