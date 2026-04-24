/**
 * Discipline Engine — Type definitions
 *
 * All TypeScript types and enums for the discipline engine.
 * Used by the engine itself, trade submission, and UI components.
 */

// ---------------------------------------------------------------------------
// Violation enums
// ---------------------------------------------------------------------------

/** Whether a violation was auto-detected from numbers or from rule checklist */
export enum ViolationCategory {
  /** Auto-detected: risk %, drawdown %, trade count */
  QUANTITATIVE = "QUANTITATIVE",
  /** Rule checklist: required rule not followed at submission */
  QUALITATIVE = "QUALITATIVE",
}

/** Specific violation types — maps 1:1 to the enforcement matrix in the spec */
export enum ViolationType {
  RISK_PER_TRADE = "RISK_PER_TRADE",
  DAILY_DRAWDOWN = "DAILY_DRAWDOWN",
  TOTAL_DRAWDOWN = "TOTAL_DRAWDOWN",
  MAX_TRADES_PER_DAY = "MAX_TRADES_PER_DAY",
  REQUIRED_RULE_MISSED = "REQUIRED_RULE_MISSED",
}

// ---------------------------------------------------------------------------
// Trade-level discipline data
// ---------------------------------------------------------------------------

/**
 * A single violation detected on a trade at submission time.
 * Stored in the trade document's `violations[]` array.
 */
export interface TradeViolation {
  /** Which violation type was triggered */
  type: ViolationType;
  /** Quantitative (auto-detected) or Qualitative (rule checklist) */
  category: ViolationCategory;
  /** Score penalty applied (absolute value, e.g. 5, 10, 15) */
  severity: number;
  /** Human-readable description of the breach */
  details: string;
  /** The configured limit that was breached (e.g. 1.0 for 1% risk) */
  threshold: number;
  /** The actual value that triggered the breach (e.g. 2.3 for 2.3% risk) */
  actual: number;
  /** For REQUIRED_RULE_MISSED — the specific rule ID that was missed */
  ruleId?: string;
}

/**
 * Engine-derived metrics computed at trade submission and stored on the
 * trade document. These are calculated from plannedSL/plannedTP and the
 * actual trade result.
 *
 * Only populated when the trader provides plannedSL (at minimum).
 */
export interface TradeEngineMetrics {
  /**
   * Intended risk as % of account.
   * Calculated from |entryPrice − plannedSL| × lotSize / accountSize × 100.
   */
  intendedRiskPct: number;

  /**
   * Planned reward-to-risk ratio.
   * Calculated from |plannedTP − entryPrice| / |entryPrice − plannedSL|.
   * null when plannedTP is not provided.
   */
  intendedRR: number | null;

  /**
   * Actual result expressed in R-multiples.
   * actualR = actual P/L ÷ intended risk amount.
   * Positive = profit, negative = loss, in units of R.
   */
  actualR: number;

  /**
   * How well the exit compared to the plan, as a ratio.
   * 1.0 = hit planned TP exactly, >1.0 = exceeded target,
   * 0.0 = exited at entry (break-even), <0.0 = loss.
   * null when plannedTP is not provided.
   */
  exitQuality: number | null;

  /** Violations detected on this specific trade */
  violations: TradeViolation[];
}

// ---------------------------------------------------------------------------
// Discipline zones
// ---------------------------------------------------------------------------

export type DisciplineZone = "GREEN" | "YELLOW" | "RED";

// ---------------------------------------------------------------------------
// Engine function input types
// ---------------------------------------------------------------------------

/**
 * Context required to evaluate violations on a single trade.
 * Caller assembles this from the Pulse document and session state.
 * The engine itself never touches Firestore.
 */
export interface EvaluationContext {
  accountSize: number;
  maxRiskPerTrade: number; // % limit from pulse config
  maxDailyDrawdown: number; // % limit from pulse config
  maxTotalDrawdown: number; // % limit from pulse config
  maxTradesPerDay: number | null; // null = no limit configured
  tradingRules: { id: string; description: string; isRequired: boolean }[];

  // Session state at the time of this trade (before this trade is counted)
  dailyTradeCount: number; // trades already logged today
  dailyLossSoFar: number; // cumulative loss $ today (positive number)
  totalDrawdown: number; // cumulative total drawdown $ (positive number)
  riskBreachesToday: number; // RISK_PER_TRADE violations already today
}

/**
 * Minimal trade data needed for violation evaluation.
 * Extracted from the full Trade type to keep the engine decoupled.
 */
export interface TradeForEvaluation {
  /** Intended risk % — from SL computation, or fallback from actual P/L */
  riskPct: number;
  /** Raw P/L amount in $ (negative = loss) */
  profitLoss: number;
  /** Rule IDs the trader checked off at submission */
  followedRules: string[];
}

/**
 * End-of-session summary used by computeRecovery.
 * Built by the caller after all trades for the day are finalized.
 */
export interface SessionSummary {
  /** Number of trades logged this session (must be ≥1 for any recovery) */
  tradeCount: number;
  /** Whether any violations occurred across all trades this session */
  hasViolations: boolean;
  /** Whether every required rule was followed on every trade */
  allRequiredRulesFollowed: boolean;
  /** Whether at least one trade has a reflection > 50 chars */
  hasFullJournal: boolean;
  /** Whether a reflection gate was completed this session (post-lockout) */
  reflectionGateCompleted: boolean;
  /** Consecutive clean days ending with this session (0 if this day has violations) */
  consecutiveCleanDays: number;
}
