"use client";

import { useState, useEffect } from "react";
import type { ActiveConstraints, DisciplineState } from "@/lib/disciplineTypes";
import { TrendingDown, Hash, Ban, Lock, RefreshCw, AlertTriangle } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SessionGateProps {
  /** Pulse Firestore document ID */
  pulseId: string;
  /** Current active constraints */
  constraints: ActiveConstraints;
  /** Current discipline state */
  disciplineState: DisciplineState;
  /** Trader's WHY statement for reminder */
  whyStatement: string;
  /** Called when trader acknowledges constraints */
  onAcknowledge: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * SessionGate — Acknowledgement screen shown when constraints are active.
 *
 * Displays active constraints and the trader's WHY statement.
 * The trader must explicitly acknowledge before trading.
 * Shown only once per session (tracked via sessionStorage).
 */
export default function SessionGate({
  pulseId,
  constraints,
  disciplineState,
  whyStatement,
  onAcknowledge,
}: SessionGateProps) {
  const [visible, setVisible] = useState(false);
  const storageKey = `sessionGate_${pulseId}_${new Date().toISOString().split("T")[0]}`;

  useEffect(() => {
    // Only show if not already acknowledged today
    const alreadyAcked = sessionStorage.getItem(storageKey);
    if (!alreadyAcked && hasActiveConstraints(constraints)) {
      setVisible(true);
    }
  }, [storageKey, constraints]);

  const handleAcknowledge = () => {
    sessionStorage.setItem(storageKey, "true");
    setVisible(false);
    onAcknowledge();
  };

  if (!visible) return null;

  const stateColors: Record<DisciplineState, { bg: string; border: string; text: string; label: string }> = {
    NORMAL: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", label: "Normal" },
    LIMITED: { bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-400", label: "Limited" },
    RESTRICTED: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", label: "Restricted" },
    RECOVERY: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400", label: "Recovery" },
  };

  const colors = stateColors[disciplineState];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-700/60 bg-[#121212] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-4 ${colors.bg} border-b ${colors.border}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gray-800/80 flex items-center justify-center">
              {disciplineState === "RESTRICTED" ? (
                <Lock className={`w-4 h-4 ${colors.text}`} />
              ) : disciplineState === "RECOVERY" ? (
                <RefreshCw className={`w-4 h-4 ${colors.text}`} />
              ) : (
                <AlertTriangle className={`w-4 h-4 ${colors.text}`} />
              )}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-200">
                Active Constraints
              </h2>
              <span className={`text-xs font-medium ${colors.text}`}>
                Status: {colors.label}
              </span>
            </div>
          </div>
        </div>

        {/* Constraint list */}
        <div className="px-6 py-4 space-y-3">
          {constraints.riskCapPct !== null && (
            <ConstraintBadge
              icon={<TrendingDown className="w-4 h-4" />}
              label="Risk Cap"
              value={`${Math.round(constraints.riskCapPct * 100)}% of your configured limit`}
              color="text-amber-400"
            />
          )}
          {constraints.tradeCapCount !== null && (
            <ConstraintBadge
              icon={<Hash className="w-4 h-4" />}
              label="Trade Cap"
              value={`Maximum ${constraints.tradeCapCount} trades today`}
              color="text-amber-400"
            />
          )}
          {constraints.noTradeDays > 0 && (
            <ConstraintBadge
              icon={<Ban className="w-4 h-4" />}
              label="No-Trade Day"
              value={`${constraints.noTradeDays} day${constraints.noTradeDays > 1 ? "s" : ""} remaining`}
              color="text-red-400"
            />
          )}
        </div>

        {/* WHY reminder */}
        {whyStatement && (
          <div className="px-6 py-3 border-t border-gray-800/60">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">
              Remember why you trade
            </p>
            <p className="text-sm text-gray-300 leading-relaxed italic">
              &ldquo;{whyStatement}&rdquo;
            </p>
          </div>
        )}

        {/* Acknowledge button */}
        <div className="px-6 py-4 border-t border-gray-800/60">
          <button
            onClick={handleAcknowledge}
            className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all
              ${colors.bg} ${colors.border} border ${colors.text}
              hover:brightness-125 active:scale-[0.98]`}
          >
            I acknowledge these constraints
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ConstraintBadge({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-gray-800/40 border border-gray-700/40">
      <div className="mt-0.5 text-gray-400">{icon}</div>
      <div>
        <p className={`text-xs font-semibold ${color}`}>{label}</p>
        <p className="text-xs text-gray-400">{value}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function hasActiveConstraints(c: ActiveConstraints): boolean {
  return (
    c.riskCapPct !== null ||
    c.tradeCapCount !== null ||
    c.lockoutUntil !== null ||
    c.noTradeDays > 0
  );
}
