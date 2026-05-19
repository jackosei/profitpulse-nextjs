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
  /** Rule checklist: required or optional rule not followed at submission */
  QUALITATIVE = "QUALITATIVE",
}

/** Specific violation types — maps 1:1 to the enforcement matrix in the spec */
export enum ViolationType {
  RISK_PER_TRADE = "RISK_PER_TRADE",
  DAILY_DRAWDOWN = "DAILY_DRAWDOWN",
  TOTAL_DRAWDOWN = "TOTAL_DRAWDOWN",
  MAX_TRADES_PER_DAY = "MAX_TRADES_PER_DAY",
  /** Required rule missed: −4 pts each */
  REQUIRED_RULE_MISSED = "REQUIRED_RULE_MISSED",
  /** Optional rule missed: −1 pt each */
  OPTIONAL_RULE_MISSED = "OPTIONAL_RULE_MISSED",
  /** Additional −5 when 2+ required rules missed in a single session */
  MULTI_REQUIRED_RULE_MISS = "MULTI_REQUIRED_RULE_MISS",
  /** Logged during an active no-trade day after explicit trader acknowledgement (−20 pts) */
  NO_TRADE_DAY_VIOLATED = "NO_TRADE_DAY_VIOLATED",
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
  /** For REQUIRED_RULE_MISSED / OPTIONAL_RULE_MISSED — the specific rule ID that was missed */
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
// Discipline zones & state
// ---------------------------------------------------------------------------

export type DisciplineZone = "GREEN" | "YELLOW" | "RED";

/** Phase 2 state machine — Phase 1 always uses NORMAL */
export type DisciplineState = "NORMAL" | "LIMITED" | "RESTRICTED" | "RECOVERY";

// ---------------------------------------------------------------------------
// Pulse-level discipline fields (stored on Pulse document)
// ---------------------------------------------------------------------------

/** Phase 2 enforcement constraints — Phase 1 stores defaults (all null/0) */
export interface ActiveConstraints {
  /** Risk cap as fraction of configured limit, e.g. 0.5 = 50%. null = no cap */
  riskCapPct: number | null;
  /** Max trades allowed. null = no cap */
  tradeCapCount: number | null;
  /** Lockout until this timestamp. null = no lockout */
  lockoutUntil: unknown | null; // Firestore Timestamp at runtime
  /** Days remaining where trading is locked entirely */
  noTradeDays: number;
  /** Number of consecutive clean sessions required to lift the current caps */
  cleanSessionsToLift: number;
}

/** Breach counts for penalty escalation */
export interface WeeklyBreachCounts {
  riskPerTrade: number;
  drawdownDaily: number;
  /** Lifetime counter — never resets on weekly boundary */
  drawdownTotal: number;
  overtrading: number;
}

/**
 * All discipline-related fields stored on the Pulse document.
 * Separated as its own interface so it can be spread into Pulse.
 */
export interface PulseDisciplineFields {
  disciplineScore: number; // 0–100, starts at 100
  disciplineState: DisciplineState; // Phase 1: always 'NORMAL'
  activeConstraints: ActiveConstraints;
  lastSessionDate: string | null; // YYYY-MM-DD, null until first trade
  reflectionGatePending: boolean;
  weeklyBreachCounts: WeeklyBreachCounts;
  whyStatement: string; // from onboarding
  whyDiscipline: string; // from onboarding
  accountabilityPartnerEmail: string | null;
  maxTradesPerDay: number | null; // null = no limit
  /** Number of consecutive calendar days with zero violations. Resets to 0 on first violation. */
  consecutiveCleanDays: number;
  /**
   * Calendar date (YYYY-MM-DD) the trader last acknowledged active constraints
   * via the SessionGate UI. Server checks this === calendarToday before allowing
   * trade submission when constraints are active.
   */
  sessionGateAckDate: string | null;
}

/** Default discipline fields for new Pulse creation */
export function createDefaultDisciplineFields(
  whyStatement: string,
  whyDiscipline: string,
): PulseDisciplineFields {
  return {
    disciplineScore: 100,
    disciplineState: "NORMAL",
    activeConstraints: {
      riskCapPct: null,
      tradeCapCount: null,
      lockoutUntil: null,
      noTradeDays: 0,
      cleanSessionsToLift: 0,
    },
    lastSessionDate: null,
    reflectionGatePending: false,
    weeklyBreachCounts: {
      riskPerTrade: 0,
      drawdownDaily: 0,
      drawdownTotal: 0,
      overtrading: 0,
    },
    whyStatement,
    whyDiscipline,
    accountabilityPartnerEmail: null,
    maxTradesPerDay: null,
    consecutiveCleanDays: 0,
    sessionGateAckDate: null,
  };
}

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

  // Phase 2: active constraints at time of trade
  activeConstraints: ActiveConstraints; // current enforcement caps/lockouts
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
 * End-of-session summary used by computeRecovery and Session Rule Score display.
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
  /**
   * Number of distinct required rules missed at least once in this session.
   * Used to trigger the additional −5 penalty when ≥2 required rules missed.
   */
  requiredRulesMissedCount: number;
  /**
   * Session Rule Score = (required rules followed ÷ total required rules) × 100.
   * 100 when no required rules are configured.
   * Computed at session-end; passed to DisciplineMeter as `sessionRuleScore`.
   */
  sessionRuleScore: number;
}

// ---------------------------------------------------------------------------
// Session Rule Score (display + computation)
// ---------------------------------------------------------------------------

/**
 * The daily execution grade, computed once per session at calendar-day boundary.
 * Displayed separately from the cumulative discipline score in DisciplineMeter.
 */
export interface SessionRuleScore {
  /** YYYY-MM-DD of the session */
  date: string;
  /** Required rules followed (numerator) */
  requiredFollowed: number;
  /** Total required rules configured on the Pulse */
  requiredTotal: number;
  /** Optional rules followed */
  optionalFollowed: number;
  /** Total optional rules configured */
  optionalTotal: number;
  /**
   * Composite score 0–100.
   * = (requiredFollowed / requiredTotal) × 100 when requiredTotal > 0,
   *   else (optionalFollowed / optionalTotal) × 100,
   *   else 100 (no rules configured).
   */
  score: number;
  /** Number of distinct required rules missed at least once this session */
  requiredMissedCount: number;
  /** Whether the additional −5 multi-miss penalty was triggered (≥2 required missed) */
  multiMissPenaltyApplied: boolean;
}

// ---------------------------------------------------------------------------
// Escalation preview (for DisciplineMeter display)
// ---------------------------------------------------------------------------

/**
 * A single row in the escalation preview table shown in DisciplineMeter.
 * Describes how close the trader is to the next enforcement consequence.
 */
export interface EscalationPreviewItem {
  /** Short human label, e.g. "Risk Breaches" */
  label: string;
  /** Breach count so far this week (or lifetime for total drawdown) */
  currentBreaches: number;
  /** Breach count at which the next consequence kicks in */
  nextThreshold: number;
  /** Human description of what happens at nextThreshold, e.g. "75% risk cap" */
  nextConsequence: string;
}

// ---------------------------------------------------------------------------
// Violation log subcollection schema
// ---------------------------------------------------------------------------

/**
 * A single document in the `pulses/{pulseId}/violationLog` subcollection.
 * Written at trade submission time for each detected violation.
 * Composite index on [pulseId, timestamp] for Phase 2 enforcement queries.
 */
export interface ViolationLogEntry {
  /** Firestore Timestamp — set by the service layer */
  timestamp: unknown;
  /** YYYY-MM-DD of the session this violation belongs to */
  sessionDate: string;
  /** Firestore document ID of the trade that triggered this violation */
  tradeId: string;
  /** The violation that was detected */
  violation: TradeViolation;
  /** Discipline score before this penalty was applied */
  scoreBefore: number;
  /** Discipline score after this penalty was applied */
  scoreAfter: number;
  /** Zone at the time of the violation */
  zone: DisciplineZone;
}
