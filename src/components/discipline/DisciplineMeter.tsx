"use client";

import type { DisciplineZone, ActiveConstraints, DisciplineState } from "@/lib/disciplineTypes";
import { TrendingDown, Hash, Ban, Info } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DisciplineMeterProps {
  /** Discipline score 0–100 */
  score: number;
  /** Zone derived from score */
  zone: DisciplineZone;
  /** Daily execution grade 0–100 (% of required rules followed today) */
  sessionRuleScore: number;
  /**
   * One-line recovery hint shown when not in GREEN zone.
   * Assembled by the parent from the engine's recovery logic.
   */
  recoveryHint: string;
  /** Phase 2: active enforcement constraints */
  activeConstraints?: ActiveConstraints;
  /** Phase 2: discipline state machine state */
  disciplineState?: DisciplineState;
}

// ---------------------------------------------------------------------------
// Derived helpers
// ---------------------------------------------------------------------------

/** Zone display text */
const ZONE_LABEL: Record<DisciplineZone, string> = {
  GREEN: "Stable",
  YELLOW: "At Risk",
  RED: "Enforcement",
};

/** Zone colour tokens — used for marker, label, and badge */
const ZONE_COLOR: Record<
  DisciplineZone,
  { text: string; bg: string; border: string; ring: string }
> = {
  GREEN: {
    text: "text-emerald-400",
    bg: "bg-emerald-500/15",
    border: "border-emerald-500/30",
    ring: "bg-emerald-400",
  },
  YELLOW: {
    text: "text-yellow-400",
    bg: "bg-yellow-500/15",
    border: "border-yellow-500/30",
    ring: "bg-yellow-400",
  },
  RED: {
    text: "text-red-400",
    bg: "bg-red-500/15",
    border: "border-red-500/30",
    ring: "bg-red-400",
  },
};

/** Session rule score → colour */
function ruleScoreColor(score: number): string {
  if (score >= 90) return "text-emerald-400";
  if (score >= 60) return "text-yellow-400";
  return "text-red-400";
}

/** Clamp score to [0, 100] for safe positioning */
function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DisciplineMeter({
  score,
  zone,
  sessionRuleScore,
  recoveryHint,
  activeConstraints,
  disciplineState,
}: DisciplineMeterProps) {
  const safeScore = clamp(Math.round(score), 0, 100);
  const colors = ZONE_COLOR[zone];

  // Marker position as a % of the bar width (left edge of marker)
  const markerLeftPct = clamp(safeScore, 0, 99); // keep visible at edges

  return (
    <div className="flex flex-col gap-2 py-2 px-3 bg-dark/40 rounded-lg border border-gray-800/60 min-w-[220px]">
      {/* ── Header row: score + zone label + session badge ── */}
      <div className="flex items-center justify-between gap-3 mb-1">
        {/* Score + zone label */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1">
            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
              Discipline Score
            </span>
            <div title="Your lifetime Discipline Score (0-100). It determines your Zone (Stable, At Risk, Enforcement) and dictates which trading constraints are active.">
              <Info className="w-3 h-3 text-gray-500 cursor-help" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-bold tabular-nums ${colors.text}`}>
              {safeScore}
            </span>
            <span className="text-xs text-gray-500">/100</span>
            <span
              className={`ml-1.5 text-xs font-medium px-1.5 py-0.5 rounded border ${colors.text} ${colors.bg} ${colors.border}`}
            >
              {ZONE_LABEL[zone]}
            </span>
          </div>
        </div>

        {/* Session Rule Score badge */}
        <div className="flex flex-col items-end gap-0.5 mt-1">
          <div className="flex items-center gap-1">
            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
              Today's Execution
            </span>
            <div title="The percentage of your qualitative trading rules you successfully followed across all trades logged today.">
              <Info className="w-3 h-3 text-gray-500 cursor-help" />
            </div>
          </div>
          <span
            className={`text-sm font-semibold tabular-nums ${ruleScoreColor(sessionRuleScore)}`}
          >
            {Math.round(sessionRuleScore)}%
          </span>
        </div>
      </div>

      {/* ── Gradient bar + marker ── */}
      <div className="relative">
        {/* Track */}
        <div
          className="h-2 w-full rounded-full overflow-hidden"
          style={{
            background:
              "linear-gradient(to right, #ef4444 0%, #f59e0b 40%, #10b981 75%, #10b981 100%)",
          }}
          role="meter"
          aria-valuenow={safeScore}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Discipline score: ${safeScore} out of 100`}
        />

        {/* Marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
          style={{ left: `${markerLeftPct}%` }}
          aria-hidden="true"
        >
          {/* Outer ring */}
          <div className="w-4 h-4 rounded-full bg-dark/90 border-2 border-gray-700 flex items-center justify-center shadow-lg">
            {/* Inner dot in zone colour */}
            <div className={`w-1.5 h-1.5 rounded-full ${colors.ring}`} />
          </div>
        </div>
      </div>

      {/* ── Zone tick labels ── */}
      <div className="flex justify-between text-[10px] text-gray-600 -mt-0.5 select-none">
        <span>0</span>
        <span>40</span>
        <span>75</span>
        <span>100</span>
      </div>

      {/* ── Recovery hint — only when not GREEN ── */}
      {zone !== "GREEN" && recoveryHint && (
        <p className="text-[11px] text-gray-400 leading-snug border-t border-gray-800/60 pt-1.5 mt-0.5">
          <span className={`font-medium ${colors.text}`}>↑ </span>
          {recoveryHint}
        </p>
      )}

      {/* ── Active constraint badges (Phase 2) ── */}
      {activeConstraints && hasActiveConstraints(activeConstraints) && (
        <div className="flex flex-wrap gap-1.5 border-t border-gray-800/60 pt-2 mt-0.5">
          {disciplineState && disciplineState !== "NORMAL" && (
            <StateBadge state={disciplineState} />
          )}
          {activeConstraints.riskCapPct !== null && (
            <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <TrendingDown className="w-3 h-3" />
              {Math.round(activeConstraints.riskCapPct * 100)}% risk cap
            </span>
          )}
          {activeConstraints.tradeCapCount !== null && (
            <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Hash className="w-3 h-3" />
              {activeConstraints.tradeCapCount} trade cap
            </span>
          )}
          {activeConstraints.noTradeDays > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
              <Ban className="w-3 h-3" />
              {activeConstraints.noTradeDays}d no-trade
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const STATE_BADGE_CONFIG: Record<
  DisciplineState,
  { label: string; color: string; bg: string; border: string }
> = {
  NORMAL: { label: "Normal", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  LIMITED: { label: "Limited", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
  RESTRICTED: { label: "Restricted", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
  RECOVERY: { label: "Recovery", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
};

function StateBadge({ state }: { state: DisciplineState }) {
  const cfg = STATE_BADGE_CONFIG[state];
  return (
    <span
      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color} border ${cfg.border}`}
    >
      {cfg.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hasActiveConstraints(c: ActiveConstraints): boolean {
  return (
    c.riskCapPct !== null ||
    c.tradeCapCount !== null ||
    c.lockoutUntil !== null ||
    c.noTradeDays > 0
  );
}
