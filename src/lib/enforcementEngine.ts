/**
 * Enforcement Engine — Pure Functions
 *
 * Phase 2 constraint computation. All functions are pure (no Firestore, no side effects).
 * Called by the API route after violations are evaluated.
 *
 * Functions:
 *  1. computeConstraints    — maps violations → active constraints
 *  2. computeStateTransition — discipline state machine
 *  3. shouldLiftConstraints  — cap lifting on clean session
 *  4. computeWeeklyReset     — Monday boundary reset
 *  5. amplifyPenalty          — zone-based severity multiplier
 *  6. mergeConstraints        — takes the more restrictive of two constraint sets
 */

import type {
  ActiveConstraints,
  EnforcementMode,
  EscalationPreviewItem,
  WeeklyBreachCounts,
  DisciplineState,
  DisciplineZone,
  TradeViolation,
} from "./disciplineTypes";
import { ViolationType } from "./disciplineTypes";

// ---------------------------------------------------------------------------
// Tier ladder — unified across both enforcement modes
// ---------------------------------------------------------------------------

/**
 * Tier 1: nothing (WHY prompt only)
 * Tier 2: 75% per-trade risk cap, 2 clean sessions to lift
 * Tier 3: 50% per-trade risk cap + NTD warning, 3 clean sessions to lift
 * Tier 4: NTD + 50% cap (extends NTD if already active). 3 clean sessions to lift
 * Tier 5: same as 4 — extended NTD pathway. Distinct only for telemetry.
 */
export type Tier = 1 | 2 | 3 | 4 | 5;

/** Map discipline score → tier (SCORE_BASED mode). */
export function tierFromScore(score: number): Tier {
  if (score >= 85) return 1;
  if (score >= 70) return 2;
  if (score >= 55) return 3;
  if (score >= 40) return 4;
  return 5;
}

/** Map weekly cumulative severity → tier (SEVERITY_BASED mode). */
export function tierFromSeverity(severity: number): Tier {
  if (severity < 5) return 1;
  if (severity < 15) return 2;
  if (severity < 25) return 3;
  if (severity < 40) return 4;
  return 5;
}

/** Compute the tier for the chosen enforcement mode. */
export function computeTier(
  mode: EnforcementMode,
  scoreAfter: number,
  weeklySeverityTotalAfter: number,
): Tier {
  return mode === "SCORE_BASED"
    ? tierFromScore(scoreAfter)
    : tierFromSeverity(weeklySeverityTotalAfter);
}

// ---------------------------------------------------------------------------
// 1. computeConstraints
// ---------------------------------------------------------------------------

/**
 * Maps violations + signals → forward-looking constraints.
 *
 * The tier ladder (risk cap + NTD) is driven by a single signal — chosen by
 * the trader at pulse creation:
 *   - SCORE_BASED: discipline score crossing thresholds (action-based recovery)
 *   - SEVERITY_BASED: weekly cumulative severity (time-based recovery)
 *
 * Both modes share the same tier outcomes:
 *   Tier 1 — nothing (WHY prompt only)
 *   Tier 2 — 75% per-trade cap, 2 clean to lift
 *   Tier 3 — 50% cap + NTD warning, 3 clean to lift
 *   Tier 4 — NTD + 50% cap (extends NTD if already active). 3 clean to lift
 *
 * Orthogonal mechanisms (mode-independent):
 *   - DAILY_DRAWDOWN → reflectionGatePending
 *   - TOTAL_DRAWDOWN → permanent lockout
 *   - MAX_TRADES_PER_DAY (first weekly, no existing cap) → tradeCapCount
 *
 * These mechanisms also contribute to score/severity, so they feed back into
 * the tier ladder.
 */
export interface ComputeConstraintsSignals {
  /** Discipline score AFTER this trade's penalties applied. */
  scoreAfter: number;
  /** Weekly severity total AFTER this trade's violations counted. */
  weeklySeverityTotalAfter: number;
  /** Breach counts after this trade — used only for MAX_TRADES first-cap. */
  weeklyBreachCounts: WeeklyBreachCounts;
}

export interface ComputeConstraintsPulseConfig {
  enforcementMode: EnforcementMode;
  maxTradesPerDay: number | null;
}

export function computeConstraints(
  violations: TradeViolation[],
  signals: ComputeConstraintsSignals,
  pulseConfig: ComputeConstraintsPulseConfig,
  existingConstraints?: ActiveConstraints,
): { constraints: ActiveConstraints; reflectionGatePending: boolean; isLockedPermanently: boolean } {
  let riskCapPct: number | null = null;
  let tradeCapCount: number | null = null;
  let noTradeDays = 0;
  let cleanSessionsToLift = 0;
  let ntdWarningPending = false;
  let reflectionGatePending = false;
  let isLockedPermanently = false;

  // ── 1. Tier-driven risk cap + NTD ──────────────────────────────────
  const tier = computeTier(
    pulseConfig.enforcementMode,
    signals.scoreAfter,
    signals.weeklySeverityTotalAfter,
  );
  if (tier === 2) {
    riskCapPct = pickMoreRestrictive(riskCapPct, 0.75);
    cleanSessionsToLift = Math.max(cleanSessionsToLift, 2);
  } else if (tier === 3) {
    riskCapPct = pickMoreRestrictive(riskCapPct, 0.5);
    cleanSessionsToLift = Math.max(cleanSessionsToLift, 3);
    ntdWarningPending = true;
  } else if (tier >= 4) {
    riskCapPct = pickMoreRestrictive(riskCapPct, 0.5);
    cleanSessionsToLift = Math.max(cleanSessionsToLift, 3);
    if (existingConstraints?.ntdWarningPending) {
      // Warning was already issued → fire NTD now. Extend by 1 if already
      // active so a breach during NTD has real constraint consequences.
      const existingNTD = existingConstraints.noTradeDays ?? 0;
      noTradeDays = Math.max(noTradeDays, existingNTD + 1);
    } else {
      // First time at tier 4 → warning only, no NTD yet.
      ntdWarningPending = true;
    }
  }
  // Tier 1: nothing (WHY prompt fires from the eval route)

  // ── 2. Orthogonal mechanisms (mode-independent) ───────────────────
  const existingTradeCap = existingConstraints?.tradeCapCount ?? null;
  for (const v of violations) {
    switch (v.type) {
      case ViolationType.DAILY_DRAWDOWN: {
        // Reflection gate fires on every DD breach. The score/severity hit
        // also feeds back into the tier ladder above.
        reflectionGatePending = true;
        cleanSessionsToLift = Math.max(cleanSessionsToLift, 3);
        break;
      }

      case ViolationType.TOTAL_DRAWDOWN: {
        isLockedPermanently = true;
        cleanSessionsToLift = Math.max(cleanSessionsToLift, 5);
        break;
      }

      case ViolationType.MAX_TRADES_PER_DAY: {
        // Overtrading is treated as a high-severity discipline failure.
        // Every breach immediately applies a 1-day no-trade lockout so the
        // trader can't log a 7th trade today; the −20 score penalty from the
        // engine also feeds into the tier ladder above.
        noTradeDays = Math.max(noTradeDays, 1);
        cleanSessionsToLift = Math.max(cleanSessionsToLift, 3);

        // First weekly overtrading breach with no existing cap → (limit−1) cap.
        // Subsequent breaches contribute via score/severity → tier ladder.
        const totalOvertradingBreaches = signals.weeklyBreachCounts.overtrading;
        const hasExistingTradeCap = existingTradeCap !== null;
        if (
          totalOvertradingBreaches === 1 &&
          !hasExistingTradeCap &&
          pulseConfig.maxTradesPerDay !== null &&
          pulseConfig.maxTradesPerDay > 1
        ) {
          tradeCapCount = pickMoreRestrictiveInt(
            tradeCapCount,
            pulseConfig.maxTradesPerDay - 1,
          );
        }
        break;
      }

      // Risk-per-trade, rule misses: no orthogonal mechanism — they only
      // contribute via severity/score → tier ladder above.
      case ViolationType.RISK_PER_TRADE:
      case ViolationType.REQUIRED_RULE_MISSED:
      case ViolationType.OPTIONAL_RULE_MISSED:
      case ViolationType.MULTI_REQUIRED_RULE_MISS:
      case ViolationType.NO_TRADE_DAY_VIOLATED:
        break;
    }
  }

  return {
    constraints: {
      riskCapPct,
      tradeCapCount,
      lockoutUntil: null, // Managed by API route for timestamp-based lockouts
      noTradeDays,
      cleanSessionsToLift,
      ntdWarningPending,
    },
    reflectionGatePending,
    isLockedPermanently,
  };
}

// ---------------------------------------------------------------------------
// 2. computeStateTransition
// ---------------------------------------------------------------------------

/**
 * Discipline state machine.
 *
 * States:
 *  - NORMAL:     score ≥ 75 AND no active constraints
 *  - LIMITED:    score 40–74 OR has riskCap/tradeCap (but no lockout/noTradeDays)
 *  - RESTRICTED: score < 40 OR has lockout/noTradeDays
 *  - RECOVERY:   transitioning out of RESTRICTED via compliance
 *
 * RECOVERY is entered when:
 *  - Previous state was RESTRICTED
 *  - Score has risen above 40
 *  - Some constraints are still active (being lifted)
 *
 * RECOVERY exits to NORMAL or LIMITED once all constraints clear.
 */
export function computeStateTransition(
  currentState: DisciplineState,
  newScore: number,
  constraints: ActiveConstraints,
): DisciplineState {
  const hasLockout =
    constraints.lockoutUntil !== null || constraints.noTradeDays > 0;
  const hasCaps =
    constraints.riskCapPct !== null || constraints.tradeCapCount !== null;
  const hasAnyConstraint = hasLockout || hasCaps;

  // RESTRICTED: score < 40 OR active lockout/no-trade days
  if (newScore < 40 || hasLockout) {
    return "RESTRICTED";
  }

  // RECOVERY: was RESTRICTED, score now ≥ 40, but some caps still active
  if (currentState === "RESTRICTED" && newScore >= 40 && hasCaps) {
    return "RECOVERY";
  }

  // RECOVERY continues until all constraints cleared
  if (currentState === "RECOVERY" && hasAnyConstraint) {
    return "RECOVERY";
  }

  // LIMITED: score 40–74 OR has caps
  if (newScore < 75 || hasCaps) {
    return "LIMITED";
  }

  // NORMAL: score ≥ 75, no constraints
  return "NORMAL";
}

// ---------------------------------------------------------------------------
// 3. shouldLiftConstraints
// ---------------------------------------------------------------------------

/**
 * After a clean capped session, determine which constraints to lift.
 *
 * A "capped session" is one where constraints were active.
 * A "clean session" means no violations occurred.
 *
 * When a capped session completes cleanly:
 *  - The active cap is removed
 *  - +5 recovery bonus points are awarded
 *  - If all constraints clear → state transitions toward NORMAL
 *
 * @returns liftedConstraints (the new constraint state) and recoveryBonus
 */
export function shouldLiftConstraints(
  currentConstraints: ActiveConstraints,
  sessionWasClean: boolean,
): { liftedConstraints: ActiveConstraints; recoveryBonus: number } {
  if (!sessionWasClean) {
    // Constraints persist if session wasn't clean
    return { liftedConstraints: currentConstraints, recoveryBonus: 0 };
  }

  let recoveryBonus = 0;
  const lifted = { ...currentConstraints };

  // Decrement the clean session requirement
  if (lifted.cleanSessionsToLift > 0) {
    lifted.cleanSessionsToLift -= 1;
  }

  // Only lift caps if we've completed the required clean sessions
  if (lifted.cleanSessionsToLift === 0) {
    // Lift risk cap (and clear the warn-then-lock state — the cap that
    // triggered the warning is gone, fresh slate going forward).
    if (lifted.riskCapPct !== null) {
      lifted.riskCapPct = null;
      lifted.ntdWarningPending = false;
      recoveryBonus += 5;
    }

    // Lift trade cap
    if (lifted.tradeCapCount !== null) {
      lifted.tradeCapCount = null;
      recoveryBonus += 5;
    }
  }

  // Decrement no-trade days
  if (lifted.noTradeDays > 0) {
    lifted.noTradeDays -= 1;
    if (lifted.noTradeDays === 0) {
      recoveryBonus += 5;
    }
  }

  // Clear lockout (time-based lockouts are checked by the API route)
  if (lifted.lockoutUntil !== null) {
    lifted.lockoutUntil = null;
    recoveryBonus += 5;
  }

  return { liftedConstraints: lifted, recoveryBonus };
}

// ---------------------------------------------------------------------------
// 4. computeWeeklyReset
// ---------------------------------------------------------------------------

/**
 * Resets weekly breach counters on Monday boundary.
 *
 * Resets: riskPerTrade, drawdownDaily, overtrading
 * NEVER resets: drawdownTotal (lifetime counter per CLAUDE.md)
 *
 * @param currentCounts   Current weekly breach counts
 * @param todayDate       YYYY-MM-DD string
 * @param lastSessionDate YYYY-MM-DD string (last day a trade was logged)
 * @returns reset counts if boundary crossed, unchanged otherwise
 */
export function computeWeeklyReset(
  currentCounts: WeeklyBreachCounts,
  todayDate: string,
  lastSessionDate: string | null,
): WeeklyBreachCounts {
  if (!lastSessionDate) return currentCounts;

  const today = new Date(todayDate);
  const lastSession = new Date(lastSessionDate);

  // Check if we've crossed a Monday boundary
  // getDay(): 0=Sun, 1=Mon, ..., 6=Sat
  // TODO: 
  // const todayDay = today.getDay();
  // const lastDay = lastSession.getDay();

  // We crossed a Monday if:
  // 1. Today is Monday or later, AND
  // 2. Last session was in a previous week
  const todayWeekStart = getMondayOfWeek(today);
  const lastWeekStart = getMondayOfWeek(lastSession);

  if (todayWeekStart.getTime() > lastWeekStart.getTime()) {
    // New week — reset weekly counters
    return {
      riskPerTrade: 0,
      drawdownDaily: 0,
      drawdownTotal: currentCounts.drawdownTotal, // NEVER reset
      overtrading: 0,
    };
  }

  return currentCounts;
}

// ---------------------------------------------------------------------------
// 5. amplifyPenalty
// ---------------------------------------------------------------------------

/**
 * Zone-based penalty amplification.
 *
 * The same violation hits harder in Yellow/Red than in Green.
 * This makes it progressively harder to recover from a deep zone,
 * creating genuine urgency around discipline.
 *
 * Multipliers:
 *  - GREEN:  1.0× (base)
 *  - YELLOW: 1.25×
 *  - RED:    1.5×
 *
 * @param baseSeverity  The raw penalty from the violation (e.g. 5, 10, 15)
 * @param zone          Current discipline zone
 * @returns amplified severity (rounded to nearest integer)
 */
export function amplifyPenalty(
  baseSeverity: number,
  zone: DisciplineZone,
): number {
  const multipliers: Record<DisciplineZone, number> = {
    GREEN: 1.0,
    YELLOW: 1.25,
    RED: 1.5,
  };

  return Math.round(baseSeverity * multipliers[zone]);
}

// ---------------------------------------------------------------------------
// 6. mergeConstraints
// ---------------------------------------------------------------------------

/**
 * Merge two constraint sets, taking the more restrictive value for each field.
 * Used when new constraints are computed but existing constraints haven't expired.
 */
export function mergeConstraints(
  existing: ActiveConstraints,
  incoming: ActiveConstraints,
): ActiveConstraints {
  return {
    riskCapPct: pickMoreRestrictive(existing.riskCapPct, incoming.riskCapPct),
    tradeCapCount: pickMoreRestrictiveInt(
      existing.tradeCapCount,
      incoming.tradeCapCount,
    ),
    lockoutUntil: existing.lockoutUntil ?? incoming.lockoutUntil,
    noTradeDays: Math.max(existing.noTradeDays, incoming.noTradeDays),
    cleanSessionsToLift: Math.max(existing.cleanSessionsToLift, incoming.cleanSessionsToLift),
    // Warning sticks once set; only cleared via shouldLiftConstraints.
    ntdWarningPending: existing.ntdWarningPending || incoming.ntdWarningPending,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * For risk cap: lower fraction = more restrictive (0.5 > 0.75 in strictness).
 * null = no cap.
 */
function pickMoreRestrictive(
  a: number | null,
  b: number | null,
): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return Math.min(a, b);
}

/**
 * For trade cap: lower count = more restrictive.
 * null = no cap.
 */
function pickMoreRestrictiveInt(
  a: number | null,
  b: number | null,
): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return Math.min(a, b);
}

/**
 * Get the Monday (start of ISO week) for a given date.
 */
function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // Adjust: Sunday (0) → -6, Monday (1) → 0, ... Saturday (6) → -5
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ---------------------------------------------------------------------------
// 7. computeEscalationPreview
// ---------------------------------------------------------------------------

/**
 * Returns the next-tier preview for the trader's chosen enforcement mode.
 * Tells the trader, in plain language, what their next tier crossing looks
 * like and how much "headroom" they have on the current tier signal.
 *
 * Pure function — does not modify any state.
 */
export function computeEscalationPreview(
  mode: EnforcementMode,
  scoreNow: number,
  weeklySeverityTotalNow: number,
  ntdWarningPending: boolean,
): EscalationPreviewItem[] {
  const currentTier = computeTier(mode, scoreNow, weeklySeverityTotalNow);

  // Tier 5 is already the cap of the ladder; no further escalation copy.
  if (currentTier >= 5) {
    return [
      {
        label: "Tier",
        currentBreaches: 5,
        nextThreshold: 5,
        nextConsequence: "Maximum enforcement — recover via clean sessions",
      },
    ];
  }

  const nextTier = (currentTier + 1) as Tier;
  const nextConsequence = describeTierConsequence(nextTier, ntdWarningPending);

  if (mode === "SCORE_BASED") {
    // Threshold at which the next tier kicks in (score must drop BELOW this).
    const nextThreshold = scoreThresholdForTier(nextTier);
    return [
      {
        label: "Discipline Score",
        // Re-using the EscalationPreviewItem shape: "currentBreaches" carries
        // the current value (score), "nextThreshold" carries the score the
        // trader must stay above to avoid the next tier.
        currentBreaches: Math.round(scoreNow),
        nextThreshold,
        nextConsequence: `Drop below ${nextThreshold}: ${nextConsequence}`,
      },
    ];
  }

  // SEVERITY_BASED
  const nextThreshold = severityThresholdForTier(nextTier);
  return [
    {
      label: "Weekly Severity",
      currentBreaches: Math.round(weeklySeverityTotalNow),
      nextThreshold,
      nextConsequence: `At ${nextThreshold}+: ${nextConsequence}`,
    },
  ];
}

function describeTierConsequence(tier: Tier, ntdWarningPending: boolean): string {
  switch (tier) {
    case 1: return "no constraint";
    case 2: return "75% per-trade risk cap";
    case 3: return "50% risk cap + no-trade-day warning";
    case 4:
    case 5:
      return ntdWarningPending
        ? "No-trade day fires"
        : "50% cap + no-trade-day warning";
  }
}

function scoreThresholdForTier(tier: Tier): number {
  // Score must be BELOW this to be in that tier.
  switch (tier) {
    case 1: return 85; // score >= 85 → tier 1
    case 2: return 70;
    case 3: return 55;
    case 4: return 40;
    case 5: return 40; // <40 is tier 5
  }
}

function severityThresholdForTier(tier: Tier): number {
  // Severity must be AT or above this to be in that tier.
  switch (tier) {
    case 1: return 0;
    case 2: return 5;
    case 3: return 15;
    case 4: return 25;
    case 5: return 40;
  }
}
