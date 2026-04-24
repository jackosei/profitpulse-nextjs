/**
 * Discipline Engine — Core logic (Phase 1: observational only)
 *
 * Pure functions for violation detection, score penalties, zone lookup,
 * and recovery computation. No Firestore calls. No enforcement logic.
 * All side-effect-free for easy testing.
 *
 * Phase 2 will move evaluation to /app/api/discipline/evaluate/route.ts
 * and add enforcement (caps, lockouts, gates). This file stays as the
 * computation kernel that the API route calls.
 */

import {
  ViolationType,
  ViolationCategory,
  type TradeViolation,
  type DisciplineZone,
  type EvaluationContext,
  type TradeForEvaluation,
  type SessionSummary,
} from "./disciplineTypes";

// ---------------------------------------------------------------------------
// Constants — penalty weights from CLAUDE.md enforcement matrix
// ---------------------------------------------------------------------------

/** Risk per trade penalty escalation by breach count today */
const RISK_PENALTY = {
  FIRST: 5, // breach 1
  SECOND: 10, // breach 2, same day
  THIRD_PLUS: 15, // breach 3+
} as const;

const DAILY_DRAWDOWN_PENALTY = 15;
const TOTAL_DRAWDOWN_PENALTY = 25;
const MAX_TRADES_PENALTY = 8;
const REQUIRED_RULE_PENALTY = 4; // per rule

/** Zone boundaries (inclusive) */
const ZONE_THRESHOLDS = {
  GREEN_MIN: 75, // 75–100
  YELLOW_MIN: 40, // 40–74
  // 0–39 = RED
} as const;

/** Recovery point values */
const RECOVERY = {
  CLEAN_SESSION: 8,
  FULL_JOURNAL: 3,
  ALL_RULES_FOLLOWED: 2,
  REFLECTION_GATE: 5,
  STREAK_BONUS: 10, // 3 consecutive clean days
  STREAK_THRESHOLD: 3,
  DAILY_CAP_GREEN: 13,
  DAILY_CAP_YELLOW: 10,
  DAILY_CAP_RED: 5,
} as const;

const SCORE_MIN = 0;
const SCORE_MAX = 100;

// ---------------------------------------------------------------------------
// 1. evaluateViolations
// ---------------------------------------------------------------------------

/**
 * Detects all quantitative and qualitative violations on a single trade.
 *
 * Quantitative (auto-detected):
 *   - riskPct vs maxRiskPerTrade — penalty escalates with breach count today
 *   - daily drawdown — fires once, on the trade that pushes past the limit
 *   - total drawdown — fires once, on the trade that pushes past the limit
 *   - trade count vs maxTradesPerDay — fires when count exceeds limit
 *
 * Qualitative:
 *   - required rules not checked off at submission
 *
 * @param trade  Minimal trade data (riskPct, profitLoss, followedRules)
 * @param ctx    Pulse config + session state assembled by the caller
 * @returns      Array of violations (empty = clean trade)
 */
export function evaluateViolations(
  trade: TradeForEvaluation,
  ctx: EvaluationContext,
): TradeViolation[] {
  const violations: TradeViolation[] = [];

  // --- Quantitative: Risk per trade ---
  if (trade.riskPct > ctx.maxRiskPerTrade) {
    const breachNumber = ctx.riskBreachesToday + 1;
    const severity =
      breachNumber === 1
        ? RISK_PENALTY.FIRST
        : breachNumber === 2
          ? RISK_PENALTY.SECOND
          : RISK_PENALTY.THIRD_PLUS;

    violations.push({
      type: ViolationType.RISK_PER_TRADE,
      category: ViolationCategory.QUANTITATIVE,
      severity,
      details: `Risk ${trade.riskPct.toFixed(2)}% exceeds limit of ${ctx.maxRiskPerTrade}% (breach #${breachNumber} today)`,
      threshold: ctx.maxRiskPerTrade,
      actual: trade.riskPct,
    });
  }

  // --- Quantitative: Daily drawdown ---
  // Only fires on the trade that pushes cumulative daily loss past the limit.
  // If already exceeded before this trade, a previous trade already got flagged.
  if (trade.profitLoss < 0) {
    const dailyLossLimit = (ctx.maxDailyDrawdown / 100) * ctx.accountSize;
    const lossAmount = Math.abs(trade.profitLoss);
    const wasAlreadyExceeded = ctx.dailyLossSoFar >= dailyLossLimit;
    const nowExceeded = ctx.dailyLossSoFar + lossAmount >= dailyLossLimit;

    if (!wasAlreadyExceeded && nowExceeded) {
      const actualPct =
        ((ctx.dailyLossSoFar + lossAmount) / ctx.accountSize) * 100;
      violations.push({
        type: ViolationType.DAILY_DRAWDOWN,
        category: ViolationCategory.QUANTITATIVE,
        severity: DAILY_DRAWDOWN_PENALTY,
        details: `Daily drawdown ${actualPct.toFixed(2)}% hit limit of ${ctx.maxDailyDrawdown}%`,
        threshold: ctx.maxDailyDrawdown,
        actual: actualPct,
      });
    }
  }

  // --- Quantitative: Total drawdown ---
  // Same once-per-breach logic as daily drawdown.
  if (trade.profitLoss < 0) {
    const totalLossLimit = (ctx.maxTotalDrawdown / 100) * ctx.accountSize;
    const lossAmount = Math.abs(trade.profitLoss);
    const wasAlreadyExceeded = ctx.totalDrawdown >= totalLossLimit;
    const nowExceeded = ctx.totalDrawdown + lossAmount >= totalLossLimit;

    if (!wasAlreadyExceeded && nowExceeded) {
      const actualPct =
        ((ctx.totalDrawdown + lossAmount) / ctx.accountSize) * 100;
      violations.push({
        type: ViolationType.TOTAL_DRAWDOWN,
        category: ViolationCategory.QUANTITATIVE,
        severity: TOTAL_DRAWDOWN_PENALTY,
        details: `Total drawdown ${actualPct.toFixed(2)}% hit limit of ${ctx.maxTotalDrawdown}%`,
        threshold: ctx.maxTotalDrawdown,
        actual: actualPct,
      });
    }
  }

  // --- Quantitative: Max trades per day ---
  // Fires when the trade count (including this trade) exceeds the limit.
  // maxTradesPerDay = 5 means 5 trades are allowed; the 6th triggers it.
  if (ctx.maxTradesPerDay !== null) {
    const newCount = ctx.dailyTradeCount + 1;
    if (newCount > ctx.maxTradesPerDay) {
      violations.push({
        type: ViolationType.MAX_TRADES_PER_DAY,
        category: ViolationCategory.QUANTITATIVE,
        severity: MAX_TRADES_PENALTY,
        details: `Trade #${newCount} exceeds daily limit of ${ctx.maxTradesPerDay}`,
        threshold: ctx.maxTradesPerDay,
        actual: newCount,
      });
    }
  }

  // --- Qualitative: Required rules missed ---
  const requiredRules = ctx.tradingRules.filter((r) => r.isRequired);
  for (const rule of requiredRules) {
    if (!trade.followedRules.includes(rule.id)) {
      violations.push({
        type: ViolationType.REQUIRED_RULE_MISSED,
        category: ViolationCategory.QUALITATIVE,
        severity: REQUIRED_RULE_PENALTY,
        details: `Required rule not followed: "${rule.description}"`,
        threshold: 1, // must be followed (1 = required)
        actual: 0, // 0 = not followed
        ruleId: rule.id,
      });
    }
  }

  return violations;
}

// ---------------------------------------------------------------------------
// 2. applyScorePenalties
// ---------------------------------------------------------------------------

/**
 * Applies violation penalties to the current discipline score.
 * Sums all violation severities and subtracts from the score.
 * Clamps result to [0, 100].
 *
 * @param currentScore  The score before this trade's violations
 * @param violations    Violations from evaluateViolations()
 * @returns             New score after penalties applied
 */
export function applyScorePenalties(
  currentScore: number,
  violations: TradeViolation[],
): number {
  const totalPenalty = violations.reduce((sum, v) => sum + v.severity, 0);
  return clamp(currentScore - totalPenalty, SCORE_MIN, SCORE_MAX);
}

// ---------------------------------------------------------------------------
// 3. getZone
// ---------------------------------------------------------------------------

/**
 * Returns the discipline zone for a given score.
 *   GREEN:  75–100 (Stable)
 *   YELLOW: 40–74  (At Risk)
 *   RED:    0–39   (Enforcement)
 */
export function getZone(score: number): DisciplineZone {
  if (score >= ZONE_THRESHOLDS.GREEN_MIN) return "GREEN";
  if (score >= ZONE_THRESHOLDS.YELLOW_MIN) return "YELLOW";
  return "RED";
}

// ---------------------------------------------------------------------------
// 4. computeRecovery
// ---------------------------------------------------------------------------

/**
 * Computes recovery points earned from a completed session.
 * Called lazily on-read, using the session summary.
 *
 * Recovery rules (from CLAUDE.md):
 *   - Clean session (no violations, ≥1 trade):    +8
 *   - Full journal (reflection >50 chars):         +3
 *   - 100% required rules followed:                +2
 *   - Reflection gate completed after lockout:     +5 (one-time)
 *   - 3 consecutive clean days:                    +10 streak bonus
 *   - Daily cap: +13 (Green), +10 (Yellow), +5 (Red)
 *
 * Guards:
 *   - No recovery while reflectionGatePending = true
 *   - Minimum 1 logged trade for any recovery credit
 *   - No-trade days don't count toward or against streak
 *
 * @param currentScore           Score before recovery
 * @param session                Summary of the completed session
 * @param reflectionGatePending  Whether a reflection gate blocks recovery
 * @returns                      Recovery points to add (0 if blocked or ineligible)
 */
export function computeRecovery(
  currentScore: number,
  session: SessionSummary,
  reflectionGatePending: boolean,
): number {
  // Guard: no recovery while reflection gate is pending
  if (reflectionGatePending) return 0;

  // Guard: must have ≥1 trade to earn any recovery
  if (session.tradeCount < 1) return 0;

  // Guard: no recovery if session had violations
  if (session.hasViolations) return 0;

  let points = 0;

  // Base: clean session
  points += RECOVERY.CLEAN_SESSION;

  // Bonus: full journal
  if (session.hasFullJournal) {
    points += RECOVERY.FULL_JOURNAL;
  }

  // Bonus: all required rules followed
  if (session.allRequiredRulesFollowed) {
    points += RECOVERY.ALL_RULES_FOLLOWED;
  }

  // Bonus: reflection gate completed (one-time, post-lockout)
  if (session.reflectionGateCompleted) {
    points += RECOVERY.REFLECTION_GATE;
  }

  // Bonus: 3 consecutive clean days streak
  if (session.consecutiveCleanDays >= RECOVERY.STREAK_THRESHOLD) {
    points += RECOVERY.STREAK_BONUS;
  }

  // Apply daily cap based on current zone
  const zone = getZone(currentScore);
  const dailyCap =
    zone === "GREEN"
      ? RECOVERY.DAILY_CAP_GREEN
      : zone === "YELLOW"
        ? RECOVERY.DAILY_CAP_YELLOW
        : RECOVERY.DAILY_CAP_RED;

  points = Math.min(points, dailyCap);

  // Clamp so score never exceeds 100
  const maxRecovery = SCORE_MAX - currentScore;
  points = Math.min(points, maxRecovery);

  return points;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ---------------------------------------------------------------------------
// Exported constants (for testing and UI display)
// ---------------------------------------------------------------------------

export const PENALTY_WEIGHTS = {
  RISK_PENALTY,
  DAILY_DRAWDOWN_PENALTY,
  TOTAL_DRAWDOWN_PENALTY,
  MAX_TRADES_PENALTY,
  REQUIRED_RULE_PENALTY,
} as const;

export const RECOVERY_WEIGHTS = RECOVERY;

export const ZONES = ZONE_THRESHOLDS;
