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
  WeeklyBreachCounts,
  DisciplineState,
  DisciplineZone,
  TradeViolation,
} from "./disciplineTypes";
import { ViolationType } from "./disciplineTypes";

// ---------------------------------------------------------------------------
// 1. computeConstraints
// ---------------------------------------------------------------------------

/**
 * Maps violations + breach history → forward-looking constraints.
 *
 * Based on the enforcement matrix in CLAUDE.md:
 *
 * | Violation              | Breach # | Constraint                                |
 * |------------------------|----------|-------------------------------------------|
 * | RISK_PER_TRADE (1st)   | weekly 1 | WHY prompt only (no constraint)           |
 * | RISK_PER_TRADE (2nd)   | weekly 2 | 75% risk cap next day                     |
 * | RISK_PER_TRADE (3rd+)  | weekly 3+| 50% cap + soft lockout                    |
 * | DAILY_DRAWDOWN         | any      | Day locked + reflection gate              |
 * | TOTAL_DRAWDOWN (1st)   | lifetime | Full lockout + 50% cap × 3 sessions       |
 * | TOTAL_DRAWDOWN (2nd+)  | lifetime | 2-day no-trade lockout                    |
 * | MAX_TRADES_PER_DAY     | any      | Day locked + (limit−1) cap next day       |
 */
export function computeConstraints(
  violations: TradeViolation[],
  weeklyBreachCounts: WeeklyBreachCounts,
  maxTradesPerDay: number | null,
): { constraints: ActiveConstraints; reflectionGatePending: boolean } {
  let riskCapPct: number | null = null;
  let tradeCapCount: number | null = null;
  let noTradeDays = 0;
  let reflectionGatePending = false;

  for (const v of violations) {
    switch (v.type) {
      case ViolationType.RISK_PER_TRADE: {
        // weeklyBreachCounts already includes this violation's increment
        const totalRiskBreaches = weeklyBreachCounts.riskPerTrade;

        if (totalRiskBreaches >= 4) {
          // Breach 4+: no-trade day escalation
          noTradeDays = Math.max(noTradeDays, 1);
        } else if (totalRiskBreaches === 3) {
          // Breach 3: 50% risk cap
          riskCapPct = pickMoreRestrictive(riskCapPct, 0.5);
        } else if (totalRiskBreaches === 2) {
          // Breach 2: 75% risk cap next day
          riskCapPct = pickMoreRestrictive(riskCapPct, 0.75);
        }
        // Breach 1: WHY prompt only — no constraint
        break;
      }

      case ViolationType.DAILY_DRAWDOWN: {
        const totalDailyDrawdownBreaches = weeklyBreachCounts.drawdownDaily;
        if (totalDailyDrawdownBreaches >= 2) {
          // Repeat in same week: no-trade day next day
          noTradeDays = Math.max(noTradeDays, 1);
        }
        // Day locked + reflection gate
        reflectionGatePending = true;
        break;
      }

      case ViolationType.TOTAL_DRAWDOWN: {
        const totalDrawdownCount = weeklyBreachCounts.drawdownTotal;

        if (totalDrawdownCount >= 2) {
          // Repeat: 2-day no-trade lockout
          noTradeDays = Math.max(noTradeDays, 2);
        } else {
          // First ever: full lockout + 50% cap for 3 sessions
          riskCapPct = pickMoreRestrictive(riskCapPct, 0.5);
          // Note: "× 3 sessions" tracking is managed by the API route via
          // a constraint duration counter (future enhancement). For now
          // the cap persists until lifted by shouldLiftConstraints.
        }
        reflectionGatePending = true;
        break;
      }

      case ViolationType.MAX_TRADES_PER_DAY: {
        const totalOvertradingBreaches = weeklyBreachCounts.overtrading;
        if (totalOvertradingBreaches >= 2) {
          // Repeat in same week: no-trade day next day
          noTradeDays = Math.max(noTradeDays, 1);
        } else if (maxTradesPerDay !== null && maxTradesPerDay > 1) {
          // Day locked + (limit−1) cap next day
          tradeCapCount = pickMoreRestrictiveInt(
            tradeCapCount,
            maxTradesPerDay - 1,
          );
        }
        break;
      }

      // Qualitative violations don't generate constraints
      case ViolationType.REQUIRED_RULE_MISSED:
      case ViolationType.OPTIONAL_RULE_MISSED:
      case ViolationType.MULTI_REQUIRED_RULE_MISS:
        break;
    }
  }

  return {
    constraints: {
      riskCapPct,
      tradeCapCount,
      lockoutUntil: null, // Managed by API route for timestamp-based lockouts
      noTradeDays,
    },
    reflectionGatePending,
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

  // Lift risk cap
  if (lifted.riskCapPct !== null) {
    lifted.riskCapPct = null;
    recoveryBonus += 5;
  }

  // Lift trade cap
  if (lifted.tradeCapCount !== null) {
    lifted.tradeCapCount = null;
    recoveryBonus += 5;
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
  const todayDay = today.getDay();
  const lastDay = lastSession.getDay();

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
