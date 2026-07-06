/**
 * Trade ingestion service — the single write path for trades.
 *
 * Extracted from /api/discipline/evaluate so that sync/import surfaces
 * (MT5 EA webhook, future CSV import, MetaApi) share the exact same
 * discipline-engine pipeline as the interactive trade form.
 *
 * Two modes:
 *  - "interactive": current trade-form behavior, byte-for-byte. Friction
 *    gates (session gate, no-trade-day ack, tier-2 caps) can bounce the
 *    trade with the same status codes/payloads the UI already handles.
 *  - "import": trades happened in the real world, so they always land.
 *    Gates never bounce — trading on a no-trade day is recorded as a
 *    NO_TRADE_DAY_VIOLATED violation, cap breaches are scored by the
 *    engine, and a locked pulse records the trade without mutating
 *    discipline state (record-only; it never unlocks).
 *
 * Import mode splits trades at `liveCutoffDate` (the pulse's
 * lastSessionDate): older trades are HISTORICAL — they get violation
 * detection (flagged `historical` in the log), dailyLoss entries and
 * session snapshots, but never touch the discipline score, constraints,
 * streaks, or `totalDrawdown`. totalDrawdown is a lifetime sum of losses,
 * so replaying months of history through it would permanently lock the
 * pulse. Rule-checklist (qualitative) violations are skipped entirely in
 * import mode: synced trades carry no followedRules, and unknown adherence
 * is not a breach.
 */

import { adminDb } from "@/services/admin";
import * as admin from "firebase-admin";
import type { Pulse, TradeRule, PulseStats } from "@/types/pulse";
import { PULSE_STATUS, isPulseLocked, PULSE_MESSAGES } from "@/types/pulse";
import type { TradeCreateData } from "@/services/api/pulseApi";
import {
  evaluateViolations,
  applyScorePenalties,
  getZone,
  computeRecovery,
  computeEngagementCredit,
} from "@/lib/disciplineEngine";
import type {
  EvaluationContext,
  TradeForEvaluation,
  TradeEngineMetrics,
  TradeViolation,
  SessionSummary,
  ViolationLogEntry,
  SessionSnapshot,
  DisciplineZone,
} from "@/lib/disciplineTypes";
import { ViolationType, ViolationCategory } from "@/lib/disciplineTypes";
import type { ActiveConstraints, DisciplineState } from "@/lib/disciplineTypes";
import { getDefaultPointValue } from "@/lib/instrumentPointValues";
import {
  computeConstraints,
  computeStateTransition,
  shouldLiftConstraints,
  computeWeeklyReset,
  amplifyPenalty,
  mergeConstraints,
} from "@/lib/enforcementEngine";
import { sendWHYReminder, sendPartnerAlert } from "@/services/notifications/emailService";
import { sendWHYReminderSMS, sendPartnerAlertSMS } from "@/services/notifications/smsService";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IngestionMode = "interactive" | "import";

/** Loaded pulse + doc id. `pulse` is mutated in memory after every write so
 *  sequential batch ingestion sees fresh state without re-reading Firestore. */
export interface PulseContext {
  firestoreId: string;
  pulse: Pulse;
}

export interface IngestInput {
  tradeData: TradeCreateData;
  noTradeDayAck?: boolean;
  capAck?: boolean;
}

export interface IngestOptions {
  mode: IngestionMode;
  /** Import mode: trades dated before this are historical (no discipline mutation). */
  liveCutoffDate?: string;
  /** Skip partner/WHY emails+SMS (import batches). */
  suppressNotifications?: boolean;
  /** Import mode: fixed doc id (`ext_{ticket}`) → duplicate posts are no-ops. */
  deterministicDocId?: string;
  /** Batch orchestrator recomputes stats/sessions once at the end instead. */
  skipStatsAndSession?: boolean;
  /** Batch orchestrator supplies per-day state to avoid one query per trade.
   *  Must be combined with skipStatsAndSession. */
  dailyContext?: { dailyTradeCount: number; riskBreachesToday: number };
}

export type IngestFailure = {
  ok: false;
  code:
    | "PULSE_LOCKED"
    | "SESSION_GATE_NOT_ACKNOWLEDGED"
    | "NO_TRADE_DAY_ACK_REQUIRED"
    | "VALIDATION_FAILED"
    | "RISK_CAP_EXCEEDED"
    | "TRADE_CAP_EXCEEDED"
    | "DUPLICATE";
  status: number;
  /** Exact JSON body the evaluate route has always returned for this case. */
  payload: Record<string, unknown>;
};

export interface IngestSuccess {
  ok: true;
  tradeId: string;
  trade: Record<string, unknown>;
  violations: TradeViolation[];
  newScore: number;
  newZone: DisciplineZone;
  newState: DisciplineState;
  activeConstraints: ActiveConstraints;
  isViolationTrade: boolean;
  reflectionGatePending: boolean;
  consecutiveCleanDays: number;
  historical: boolean;
}

export type IngestResult = IngestSuccess | IngestFailure;

const DEFAULT_CONSTRAINTS: ActiveConstraints = {
  riskCapPct: null,
  tradeCapCount: null,
  lockoutUntil: null,
  noTradeDays: 0,
  cleanSessionsToLift: 0,
  ntdWarningPending: false,
};

// ---------------------------------------------------------------------------
// Pulse loaders
// ---------------------------------------------------------------------------

/** Resolve a pulse by its human-readable id + owner uid (trade-form path). */
export async function loadPulseByHumanId(
  pulseId: string,
  userId: string,
): Promise<PulseContext | null> {
  const pulsesSnap = await adminDb
    .collection("pulses")
    .where("id", "==", pulseId)
    .where("userId", "==", userId)
    .limit(1)
    .get();
  if (pulsesSnap.empty) return null;
  const doc = pulsesSnap.docs[0];
  return { firestoreId: doc.id, pulse: doc.data() as Pulse };
}

/** Resolve a pulse by Firestore doc id (API-key / EA path). */
export async function loadPulseByDocId(
  firestoreId: string,
): Promise<PulseContext | null> {
  const doc = await adminDb.collection("pulses").doc(firestoreId).get();
  if (!doc.exists) return null;
  return { firestoreId: doc.id, pulse: doc.data() as Pulse };
}

// ---------------------------------------------------------------------------
// Core ingestion
// ---------------------------------------------------------------------------

export async function ingestTrade(
  ctx: PulseContext,
  input: IngestInput,
  opts: IngestOptions,
): Promise<IngestResult> {
  const { firestoreId, pulse: pulseData } = ctx;
  const { tradeData } = input;
  const isImport = opts.mode === "import";

  // ── Lock check ───────────────────────────────────────────────────────
  const locked = isPulseLocked(pulseData);
  if (locked && pulseData.status !== PULSE_STATUS.LOCKED) {
    // Lazy migration: Update status in Firestore for legacy pulses that breached before the new logic
    await adminDb.collection("pulses").doc(firestoreId).update({
      status: PULSE_STATUS.LOCKED,
    });
    pulseData.status = PULSE_STATUS.LOCKED;
  }
  if (locked && !isImport) {
    return {
      ok: false,
      code: "PULSE_LOCKED",
      status: 403,
      payload: { error: PULSE_MESSAGES.LOCKED_ERROR_MESSAGE },
    };
  }

  const discipline = pulseData.discipline;
  const calendarToday = new Date().toISOString().split("T")[0];
  const currentConstraints: ActiveConstraints =
    discipline?.activeConstraints ?? DEFAULT_CONSTRAINTS;

  // Session date of this trade (route has always called this `today`).
  const today = new Date(tradeData.date).toISOString().split("T")[0];

  // Import mode: pre-cutoff trades — and anything landing on a locked pulse —
  // are record-only history.
  const historical =
    isImport &&
    (locked || (opts.liveCutoffDate !== undefined && today < opts.liveCutoffDate));

  // Import mode implies the acknowledgements a human would click through:
  // the trade already happened, so caps/NTD become scored violations instead
  // of rejections. Historical trades skip the NTD injection — today's
  // constraints don't apply to last month's sessions.
  const noTradeDayAck = isImport ? !historical : (input.noTradeDayAck ?? false);
  const capAck = isImport ? true : (input.capAck ?? false);

  // ── Friction gate checks (interactive only) ──────────────────────────
  if (!isImport) {
    const hasAnyCaps =
      currentConstraints.riskCapPct !== null ||
      currentConstraints.tradeCapCount !== null ||
      currentConstraints.noTradeDays > 0;

    // Tier 2/3: Session gate must be acknowledged before any trade on a constrained day.
    if (hasAnyCaps && discipline?.sessionGateAckDate !== calendarToday) {
      return {
        ok: false,
        code: "SESSION_GATE_NOT_ACKNOWLEDGED",
        status: 403,
        payload: { error: "SESSION_GATE_NOT_ACKNOWLEDGED" },
      };
    }

    // Tier 3: No-trade day — requires explicit per-trade typed acknowledgement.
    if (currentConstraints.noTradeDays > 0 && !noTradeDayAck) {
      return {
        ok: false,
        code: "NO_TRADE_DAY_ACK_REQUIRED",
        status: 409,
        payload: {
          error: "NO_TRADE_DAY_ACK_REQUIRED",
          daysRemaining: currentConstraints.noTradeDays,
        },
      };
    }
  }

  // ── Validate trade data ──────────────────────────────────────────────
  if (
    !tradeData.instrument ||
    !tradeData.execution.lotSize ||
    !tradeData.execution.entryPrice ||
    !tradeData.execution.exitPrice ||
    !tradeData.execution.entryReason
  ) {
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      status: 400,
      payload: { error: "Missing required trade fields" },
    };
  }

  if (
    tradeData.execution.entryTime &&
    tradeData.execution.exitTime &&
    tradeData.execution.entryTime > tradeData.execution.exitTime
  ) {
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      status: 400,
      payload: { error: "Entry time must be earlier than exit time" },
    };
  }

  // Price vs P/L consistency check. Skipped for synced/imported trades:
  // broker statements are authoritative, and commission/swap legitimately
  // flip the net sign near break-even.
  if (!isImport) {
    const priceDiff =
      tradeData.execution.exitPrice - tradeData.execution.entryPrice;
    const expectedProfitable =
      (tradeData.type === "Buy" && priceDiff > 0) ||
      (tradeData.type === "Sell" && priceDiff < 0);
    const isProfitable = tradeData.performance.profitLoss > 0;

    if (isProfitable !== expectedProfitable && tradeData.performance.profitLoss !== 0) {
      return {
        ok: false,
        code: "VALIDATION_FAILED",
        status: 400,
        payload: {
          error: `P/L doesn't match entry/exit prices. For a ${tradeData.type} trade with entry at ${tradeData.execution.entryPrice} and exit at ${tradeData.execution.exitPrice}, the P/L should ${expectedProfitable ? "be positive" : "be negative"}`,
        },
      };
    }
  }

  // ── Session context ──────────────────────────────────────────────────
  const dailyLosses: number = pulseData.dailyLoss?.[today] || 0;

  let dailyTradeCount: number;
  let riskBreachesToday: number;
  let todayTradesDocs: admin.firestore.DocumentData[] = [];

  if (opts.dailyContext) {
    dailyTradeCount = opts.dailyContext.dailyTradeCount;
    riskBreachesToday = opts.dailyContext.riskBreachesToday;
  } else {
    // Count today's trades
    const todayTradesSnap = await adminDb
      .collection("pulses")
      .doc(firestoreId)
      .collection("trades")
      .where("date", "==", today)
      .get();
    dailyTradeCount = todayTradesSnap.size;
    todayTradesDocs = todayTradesSnap.docs.map((d) => d.data());
    riskBreachesToday = todayTradesSnap.docs.reduce((count, d) => {
      const t = d.data();
      return (
        count +
        ((t.engineMetrics?.violations as Array<{ type: string }>) ?? []).filter(
          (v) => v.type === "RISK_PER_TRADE",
        ).length
      );
    }, 0);
  }

  // ── Lazy recovery ────────────────────────────────────────────────────
  // Day-boundary bookkeeping: weekly resets, constraint lifting, streaks,
  // recovery points. Historical backfill skips it entirely — those sessions
  // are in the past and must not move live discipline state.
  const lastSessionDate = discipline?.lastSessionDate ?? null;
  const isNewDay = lastSessionDate !== null && lastSessionDate !== today;

  if (!historical && isNewDay && discipline && dailyTradeCount === 0) {
    // ── Weekly breach count + severity total reset (Monday boundary) ─
    const resetCounts = computeWeeklyReset(
      discipline.weeklyBreachCounts ?? {
        riskPerTrade: 0, drawdownDaily: 0, drawdownTotal: 0, overtrading: 0,
      },
      today,
      lastSessionDate,
    );
    const countsChanged =
      resetCounts.riskPerTrade !== (discipline.weeklyBreachCounts?.riskPerTrade ?? 0) ||
      resetCounts.drawdownDaily !== (discipline.weeklyBreachCounts?.drawdownDaily ?? 0) ||
      resetCounts.overtrading !== (discipline.weeklyBreachCounts?.overtrading ?? 0);
    if (countsChanged) {
      await adminDb.collection("pulses").doc(firestoreId).update({
        "discipline.weeklyBreachCounts": resetCounts,
        // Severity total tracks the same week — reset together.
        "discipline.weeklySeverityTotal": 0,
      });
      discipline.weeklyBreachCounts = resetCounts;
      discipline.weeklySeverityTotal = 0;
    }

    // ── Constraint lifting (clean previous session) ────────────────
    const prevSnap = await adminDb
      .collection("pulses")
      .doc(firestoreId)
      .collection("trades")
      .where("date", "==", lastSessionDate)
      .get();
    const prevTrades = prevSnap.docs.map((d) => d.data());

    const prevHasViolations = prevTrades.some(
      (t) => ((t.engineMetrics?.violations as Array<unknown>) ?? []).length > 0,
    );
    const sessionWasClean = !prevHasViolations && prevTrades.length > 0;

    // Lift constraints if previous capped session was clean
    const existingConstraints = discipline.activeConstraints ?? DEFAULT_CONSTRAINTS;
    const { liftedConstraints, recoveryBonus: liftBonus } =
      shouldLiftConstraints(existingConstraints, sessionWasClean);

    if (liftBonus > 0) {
      await adminDb.collection("pulses").doc(firestoreId).update({
        "discipline.activeConstraints": liftedConstraints,
      });
      discipline.activeConstraints = liftedConstraints;
    }

    // ── Streak tracking ────────────────────────────────────────────
    // Increment consecutiveCleanDays if previous session was clean (≥1 trade,
    // no violations). No-trade days are neutral — skip the counter entirely.
    // On violation, reset to 0.
    const currentStreak = discipline.consecutiveCleanDays ?? 0;
    let newStreak = currentStreak;
    if (prevTrades.length > 0) {
      newStreak = sessionWasClean ? currentStreak + 1 : 0;
    }
    if (newStreak !== currentStreak) {
      await adminDb.collection("pulses").doc(firestoreId).update({
        "discipline.consecutiveCleanDays": newStreak,
      });
      discipline.consecutiveCleanDays = newStreak;
    }

    // ── Recovery points ────────────────────────────────────────────
    const pulseRules: TradeRule[] = pulseData.tradingRules ?? [];
    const requiredRuleIds = pulseRules
      .filter((r) => r.isRequired)
      .map((r) => r.id);
    const allRequiredFollowed =
      requiredRuleIds.length === 0 ||
      prevTrades.every((t) =>
        requiredRuleIds.every((id) =>
          ((t.followedRules as string[]) ?? []).includes(id),
        ),
      );

    // v4.7.0: per-section engagement credit. Replaces the broken
    // `reflection.whatILearned` check (that field was never written by
    // the form, so the old +3 full-journal bonus was unreachable).
    const engagementScore = computeEngagementCredit(prevTrades);

    const prevSession: SessionSummary = {
      tradeCount: prevTrades.length,
      hasViolations: prevHasViolations,
      allRequiredRulesFollowed: allRequiredFollowed,
      hasFullJournal: engagementScore >= 2,  // deprecated field; derive for legacy reads
      engagementScore,
      reflectionGateCompleted: false,
      // Pass the NEW streak (after today's increment) so computeRecovery
      // can apply the +10 bonus if we've just completed day 3+
      consecutiveCleanDays: newStreak,
      requiredRulesMissedCount: 0,
      sessionRuleScore: 100,
    };

    const recoveryPts = computeRecovery(
      discipline.disciplineScore ?? 100,
      prevSession,
      discipline.reflectionGatePending ?? false,
    ) + liftBonus;

    if (recoveryPts > 0) {
      const recoveredScore = Math.min(
        100,
        (discipline.disciplineScore ?? 100) + recoveryPts,
      );
      const recoveredState = computeStateTransition(
        discipline.disciplineState ?? "NORMAL",
        recoveredScore,
        discipline.activeConstraints ?? DEFAULT_CONSTRAINTS,
      );
      await adminDb.collection("pulses").doc(firestoreId).update({
        "discipline.disciplineScore": recoveredScore,
        "discipline.disciplineState": recoveredState,
      });
      discipline.disciplineScore = recoveredScore;
      discipline.disciplineState = recoveredState;
    }
  }

  // ── Build evaluation context ─────────────────────────────────────────
  const ctxConstraints: ActiveConstraints =
    discipline?.activeConstraints ?? DEFAULT_CONSTRAINTS;

  const evalCtx: EvaluationContext = {
    accountSize: pulseData.accountSize,
    maxRiskPerTrade: pulseData.maxRiskPerTrade,
    maxDailyDrawdown: pulseData.maxDailyDrawdown,
    maxTotalDrawdown: pulseData.maxTotalDrawdown,
    maxTradesPerDay: discipline?.maxTradesPerDay ?? null,
    // Import mode: synced trades carry no rule checklist — unknown adherence
    // is not a breach, so qualitative rule evaluation is disabled.
    tradingRules: isImport ? [] : (pulseData.tradingRules ?? []),
    dailyTradeCount,
    dailyLossSoFar: Math.abs(dailyLosses),
    // Historical trades must never fire TOTAL_DRAWDOWN (a terminal-breach
    // marker tied to live state) — saturate so wasAlreadyExceeded is true.
    totalDrawdown: historical ? Number.MAX_SAFE_INTEGER : (pulseData.totalDrawdown ?? 0),
    riskBreachesToday,
    // Today's caps don't apply to backfilled past sessions.
    activeConstraints: historical ? DEFAULT_CONSTRAINTS : ctxConstraints,
  };

  // ── Compute risk from SL ─────────────────────────────────────────────
  const { plannedSL, plannedTP, entryPrice, lotSize } = tradeData.execution;
  const instrumentSymbol = tradeData.instrument ?? "";
  const pointValue =
    pulseData.instrumentPointValues?.[instrumentSymbol] ??
    pulseData.instrumentPointValues?.[instrumentSymbol.toUpperCase()] ??
    getDefaultPointValue(instrumentSymbol);
  const riskPctFromSL =
    plannedSL && entryPrice && lotSize
      ? (Math.abs(entryPrice - plannedSL) *
        pointValue *
        lotSize /
        pulseData.accountSize) *
      100
      : 0;

  // ── Tier 2 cap enforcement ───────────────────────────────────────────
  // Risk cap: if active and trade risk exceeds the cap, require capAck.
  if (ctxConstraints.riskCapPct !== null && !capAck) {
    const effectiveCap = pulseData.maxRiskPerTrade * ctxConstraints.riskCapPct;
    if (riskPctFromSL > effectiveCap) {
      return {
        ok: false,
        code: "RISK_CAP_EXCEEDED",
        status: 422,
        payload: {
          error: "RISK_CAP_EXCEEDED",
          cap: effectiveCap,
          actual: riskPctFromSL,
        },
      };
    }
  }
  // Trade cap: if active and daily count already at limit, require capAck.
  if (ctxConstraints.tradeCapCount !== null && !capAck) {
    if (dailyTradeCount >= ctxConstraints.tradeCapCount) {
      return {
        ok: false,
        code: "TRADE_CAP_EXCEEDED",
        status: 422,
        payload: {
          error: "TRADE_CAP_EXCEEDED",
          cap: ctxConstraints.tradeCapCount,
          count: dailyTradeCount,
        },
      };
    }
  }

  const tradeForEval: TradeForEvaluation = {
    riskPct: riskPctFromSL,
    profitLoss: tradeData.performance.profitLoss,
    followedRules: tradeData.followedRules ?? [],
  };

  // ── Evaluate violations ──────────────────────────────────────────────
  const violations = evaluateViolations(tradeForEval, evalCtx);

  // ── Compute engine metrics ───────────────────────────────────────────
  let engineMetrics: TradeEngineMetrics;

  if (plannedSL && entryPrice && lotSize) {
    const slDistance = Math.abs(entryPrice - plannedSL);
    const riskAmountFromSL = slDistance * pointValue * lotSize;
    const intendedRiskPct =
      (riskAmountFromSL / pulseData.accountSize) * 100;

    const intendedRR =
      plannedTP && slDistance > 0
        ? Math.abs(plannedTP - entryPrice) / slDistance
        : null;

    const actualR =
      riskAmountFromSL > 0
        ? tradeData.performance.profitLoss / riskAmountFromSL
        : 0;

    const exitQuality =
      plannedTP && slDistance > 0
        ? (tradeData.performance.profitLoss / riskAmountFromSL) /
        (Math.abs(plannedTP - entryPrice) / slDistance)
        : null;

    engineMetrics = {
      intendedRiskPct,
      intendedRR,
      actualR,
      exitQuality,
      violations,
    };
  } else {
    engineMetrics = {
      intendedRiskPct: 0,
      intendedRR: null,
      actualR: 0,
      exitQuality: null,
      violations,
    };
  }

  // ── Write trade document ─────────────────────────────────────────────
  const tradeWithTimestamp = {
    ...tradeData,
    engineMetrics,
    createdAt: admin.firestore.Timestamp.now(),
  };

  const tradesCol = adminDb
    .collection("pulses")
    .doc(firestoreId)
    .collection("trades");

  let tradeDocRef: admin.firestore.DocumentReference;
  if (opts.deterministicDocId) {
    tradeDocRef = tradesCol.doc(opts.deterministicDocId);
    try {
      await tradeDocRef.create(tradeWithTimestamp);
    } catch (e) {
      if ((e as { code?: number }).code === 6 /* gRPC ALREADY_EXISTS */) {
        return {
          ok: false,
          code: "DUPLICATE",
          status: 409,
          payload: {
            error: "DUPLICATE_TRADE",
            externalId: tradeData.externalId ?? opts.deterministicDocId,
          },
        };
      }
      throw e;
    }
  } else {
    tradeDocRef = await tradesCol.add(tradeWithTimestamp);
  }

  // ── Write violation log ──────────────────────────────────────────────
  if (violations.length > 0) {
    const violationLogRef = adminDb
      .collection("pulses")
      .doc(firestoreId)
      .collection("violationLog");
    const scoreBefore = discipline?.disciplineScore ?? 100;
    let runningScore = scoreBefore;

    const batch = adminDb.batch();
    for (const violation of violations) {
      // Historical entries never moved the live score.
      const scoreAfter = historical
        ? runningScore
        : Math.max(0, runningScore - violation.severity);
      const entry: ViolationLogEntry = {
        timestamp: admin.firestore.Timestamp.now(),
        sessionDate: today,
        tradeId: tradeDocRef.id,
        violation,
        scoreBefore: runningScore,
        scoreAfter,
        zone: getZone(runningScore),
        ...(historical ? { historical: true } : {}),
      };
      runningScore = scoreAfter;
      batch.set(violationLogRef.doc(), entry);
    }
    await batch.commit();
  }

  // ── Update daily loss ────────────────────────────────────────────────
  if (tradeData.performance.profitLoss < 0) {
    const newDailyLoss =
      (dailyLosses || 0) + Math.abs(tradeData.performance.profitLoss);
    await adminDb
      .collection("pulses")
      .doc(firestoreId)
      .update({ [`dailyLoss.${today}`]: newDailyLoss });
    pulseData.dailyLoss = { ...(pulseData.dailyLoss ?? {}), [today]: newDailyLoss };
  }

  // ── Update total drawdown ────────────────────────────────────────────
  // Lifetime loss sum — the pulse-lock signal. Historical backfill must not
  // feed it, or importing months of normal losses would lock the pulse.
  if (!historical && tradeData.performance.profitLoss < 0) {
    const totalDrawdown = pulseData.totalDrawdown || 0;
    const newTotalDrawdown =
      totalDrawdown + Math.abs(tradeData.performance.profitLoss);
    await adminDb.collection("pulses").doc(firestoreId).update({
      totalDrawdown: newTotalDrawdown,
    });
    pulseData.totalDrawdown = newTotalDrawdown;
  }

  // ── Update discipline score + enforcement ────────────────────────────
  let newScore = discipline?.disciplineScore ?? 100;
  let newZone = getZone(newScore);
  let newConstraints: ActiveConstraints = ctxConstraints;
  let newState: DisciplineState = discipline?.disciplineState ?? "NORMAL";
  let isViolationTrade = false;

  // Flag if trading under no-trade-day (acknowledged via noTradeDayAck)
  if (!historical && ctxConstraints.noTradeDays > 0 && noTradeDayAck) {
    isViolationTrade = true;
    // Inject NO_TRADE_DAY_VIOLATED into violations so the engine scores it
    violations.push({
      type: ViolationType.NO_TRADE_DAY_VIOLATED,
      category: ViolationCategory.QUANTITATIVE,
      severity: 20,
      details: `Trade logged on a mandated no-trade day (${ctxConstraints.noTradeDays} day${ctxConstraints.noTradeDays > 1 ? "s" : ""} remaining).`,
      threshold: 0,
      actual: 1,
    });
  }

  if (!historical && discipline && violations.length > 0) {
    // ── Zone amplification: penalties hit harder in Yellow/Red ──────
    const currentZone = getZone(discipline.disciplineScore ?? 100);
    const amplifiedViolations = violations.map((v) => ({
      ...v,
      severity: amplifyPenalty(v.severity, currentZone),
    }));

    const currentScore = discipline.disciplineScore ?? 100;
    newScore = applyScorePenalties(currentScore, amplifiedViolations);
    newZone = getZone(newScore);

    // ── Breach count increments ────────────────────────────────────
    const currentCounts = discipline.weeklyBreachCounts ?? {
      riskPerTrade: 0, drawdownDaily: 0, drawdownTotal: 0, overtrading: 0,
    };
    const updatedCounts = { ...currentCounts };
    for (const v of violations) {
      switch (v.type) {
        case ViolationType.RISK_PER_TRADE:
          updatedCounts.riskPerTrade += 1; break;
        case ViolationType.DAILY_DRAWDOWN:
          updatedCounts.drawdownDaily += 1; break;
        case ViolationType.TOTAL_DRAWDOWN:
          updatedCounts.drawdownTotal += 1; break;
        case ViolationType.MAX_TRADES_PER_DAY:
          updatedCounts.overtrading += 1; break;
      }
    }

    // ── Weekly severity total (used by SEVERITY_BASED tier ladder) ───
    // Accumulate the AMPLIFIED severity so zone amplification feeds back
    // into the tier signal. Reset on Monday alongside breach counts.
    const currentSeverityTotal = discipline.weeklySeverityTotal ?? 0;
    const thisTradeSeverity = amplifiedViolations.reduce(
      (sum, v) => sum + v.severity,
      0,
    );
    const updatedSeverityTotal = currentSeverityTotal + thisTradeSeverity;

    // ── Compute enforcement constraints (mode-driven tier ladder) ──
    const enforcementMode = discipline.enforcementMode ?? "SCORE_BASED";
    const { constraints: incomingConstraints, reflectionGatePending, isLockedPermanently } =
      computeConstraints(
        violations,
        {
          scoreAfter: newScore,
          weeklySeverityTotalAfter: updatedSeverityTotal,
          weeklyBreachCounts: updatedCounts,
        },
        {
          enforcementMode,
          maxTradesPerDay: discipline.maxTradesPerDay ?? null,
        },
        ctxConstraints,
      );
    newConstraints = mergeConstraints(ctxConstraints, incomingConstraints);
    newState = computeStateTransition(
      discipline.disciplineState ?? "NORMAL",
      newScore,
      newConstraints,
    );

    await adminDb
      .collection("pulses")
      .doc(firestoreId)
      .update({
        "discipline.disciplineScore": newScore,
        "discipline.disciplineState": newState,
        "discipline.activeConstraints": newConstraints,
        "discipline.reflectionGatePending":
          reflectionGatePending || (discipline.reflectionGatePending ?? false),
        "discipline.lastSessionDate": today,
        "discipline.weeklyBreachCounts": updatedCounts,
        "discipline.weeklySeverityTotal": updatedSeverityTotal,
        // Reset streak — any violation day breaks the consecutive clean chain
        "discipline.consecutiveCleanDays": 0,
      });
    // Mirror in memory so streak is consistent for the rest of this request
    // (and so sequential batch ingestion sees fresh state).
    discipline.disciplineScore = newScore;
    discipline.disciplineState = newState;
    discipline.activeConstraints = newConstraints;
    discipline.lastSessionDate = today;
    discipline.weeklyBreachCounts = updatedCounts;
    discipline.weeklySeverityTotal = updatedSeverityTotal;
    discipline.consecutiveCleanDays = 0;

    if (isLockedPermanently) {
      await adminDb.collection("pulses").doc(firestoreId).update({
        status: PULSE_STATUS.LOCKED,
      });
      pulseData.status = PULSE_STATUS.LOCKED;

      // ── Tier 2 notifications: terminal lockout ─────────────────────
      const partnerEmail = discipline.accountabilityPartnerEmail;
      const traderEmail = pulseData.userId; // resolved to email below (best-effort)
      if (partnerEmail && !opts.suppressNotifications) {
        void sendPartnerAlert({
          partnerEmail,
          traderName: traderEmail,
          pulseName: pulseData.name,
          breachType: "TOTAL_DRAWDOWN_LOCKED",
          disciplineScore: newScore,
          details: "Total drawdown limit breached — pulse permanently locked.",
        });
        void sendPartnerAlertSMS({
          to: "", // populated when trader's phone is stored on their profile
          traderName: traderEmail,
          pulseName: pulseData.name,
          breachType: "TOTAL_DRAWDOWN_LOCKED",
        });
      }
    }

    // ── Tier 2: Partner alert ───────────────────────────────────────
    // Single alert per trade — picked by priority so the partner gets the
    // most salient signal rather than a flurry of overlapping emails.
    // Priority (high → low):
    //   1. TOTAL_DRAWDOWN_LOCKED — handled above with isLockedPermanently
    //   2. NO_TRADE_DAY — NTD freshly applied (0 → >0)
    //   3. DAILY_DRAWDOWN — DD breach this trade
    //   4. NTD_WARNING — warn-then-lock first crossing into tier 4
    if (
      discipline.accountabilityPartnerEmail &&
      !isLockedPermanently &&
      !opts.suppressNotifications
    ) {
      const ntdJustApplied =
        (ctxConstraints.noTradeDays ?? 0) === 0 &&
        newConstraints.noTradeDays > 0;
      const warningJustSet =
        !ctxConstraints.ntdWarningPending &&
        newConstraints.ntdWarningPending;
      const hasDailyDrawdownBreach = violations.some(
        (v) => v.type === ViolationType.DAILY_DRAWDOWN,
      );

      let alert: {
        breachType: "DAILY_DRAWDOWN" | "NTD_WARNING" | "NO_TRADE_DAY";
        details: string;
      } | null = null;

      if (ntdJustApplied) {
        alert = {
          breachType: "NO_TRADE_DAY",
          details: `No-trade day applied (${newConstraints.noTradeDays} day${newConstraints.noTradeDays === 1 ? "" : "s"} remaining). 50% risk cap active.`,
        };
      } else if (hasDailyDrawdownBreach) {
        alert = {
          breachType: "DAILY_DRAWDOWN",
          details: "Daily drawdown limit hit.",
        };
      } else if (warningJustSet) {
        alert = {
          breachType: "NTD_WARNING",
          details: "Discipline engine entered tier 4 — next risk breach will trigger a no-trade day. 50% risk cap is now active.",
        };
      }

      if (alert) {
        void sendPartnerAlert({
          partnerEmail: discipline.accountabilityPartnerEmail,
          traderName: pulseData.userId,
          pulseName: pulseData.name,
          breachType: alert.breachType,
          disciplineScore: newScore,
          details: alert.details,
        });
        void sendPartnerAlertSMS({
          to: "",
          traderName: pulseData.userId,
          pulseName: pulseData.name,
          breachType: alert.breachType,
        });
      }
    }

    // ── Tier 1: WHY reminder ──────────────────────────────────────────
    // Fires on (a) zone degradation OR (b) first risk-per-trade breach of
    // the week (spec: "breach 1 = WHY prompt only"). The second condition
    // ensures the trader always gets feedback on their first weekly risk
    // breach even when the score deduction doesn't degrade the zone.
    if (!opts.suppressNotifications) {
      const prevZone = getZone(currentScore);
      const zoneWorsened =
        (prevZone === "GREEN" && (newZone === "YELLOW" || newZone === "RED")) ||
        (prevZone === "YELLOW" && newZone === "RED");
      const isFirstRiskBreachOfWeek =
        violations.some((v) => v.type === ViolationType.RISK_PER_TRADE) &&
        updatedCounts.riskPerTrade === 1;
      const shouldFireWHY = zoneWorsened || isFirstRiskBreachOfWeek;
      if (shouldFireWHY && pulseData.userId) {
        // Fire-and-forget — fetch trader email from Admin Auth.
        void admin.auth().getUser(pulseData.userId).then((userRecord) => {
          if (userRecord.email) {
            void sendWHYReminder({
              traderEmail: userRecord.email,
              traderName: userRecord.displayName ?? userRecord.email,
              pulseName: pulseData.name,
              whyStatement: discipline.whyStatement ?? "",
              whyDiscipline: discipline.whyDiscipline ?? "",
              disciplineZone: newZone,
              disciplineScore: newScore,
            });
            void sendWHYReminderSMS({
              to: userRecord.phoneNumber ?? "",
              traderName: userRecord.displayName ?? userRecord.email,
              pulseName: pulseData.name,
              zone: newZone === "RED" ? "RED" : "YELLOW",
              score: newScore,
            });
          }
        }).catch(() => {/* silent — notifications are non-critical */});
      }
    }

  } else if (!historical && discipline) {
    // Clean trade — update last session date, compute state
    newState = computeStateTransition(
      discipline.disciplineState ?? "NORMAL",
      newScore,
      ctxConstraints,
    );
    await adminDb.collection("pulses").doc(firestoreId).update({
      "discipline.lastSessionDate": today,
      "discipline.disciplineState": newState,
    });
    discipline.lastSessionDate = today;
    discipline.disciplineState = newState;
  }

  // ── Recalculate pulse stats + session snapshot ───────────────────────
  // Batch imports defer both: incremental stats math is only safe one trade
  // at a time, so the orchestrator does a full recompute at the end.
  if (!opts.skipStatsAndSession) {
    const newStats = await recalculateStatsIncremental(firestoreId, pulseData, tradeData);
    pulseData.stats = newStats;

    // todayTradesDocs was fetched before this trade was written, so append
    // the new trade manually — avoids an extra Firestore read.
    const allTodayTrades = [...todayTradesDocs, tradeWithTimestamp];
    const sessionWins   = allTodayTrades.filter(t => t.outcome === "Win").length;
    const sessionLosses = allTodayTrades.filter(t => t.outcome === "Loss").length;
    const sessionPnL    = allTodayTrades.reduce((s, t) => s + (t.performance?.profitLoss ?? 0), 0);
    const sessionHasViolations = violations.length > 0
      || todayTradesDocs.some(t =>
          ((t.engineMetrics?.violations as unknown[]) ?? []).length > 0,
        );
    const sessionEngagement = computeEngagementCredit(allTodayTrades);

    const snapshot: SessionSnapshot = {
      date: today,
      tradeCount: allTodayTrades.length,
      wins: sessionWins,
      losses: sessionLosses,
      totalPnL: sessionPnL,
      disciplineScoreAfter: newScore,
      zone: newZone,
      hasViolations: sessionHasViolations,
      engagementScore: sessionEngagement,
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await adminDb
      .collection("pulses")
      .doc(firestoreId)
      .collection("sessions")
      .doc(today)
      .set(snapshot);
  }

  return {
    ok: true,
    tradeId: tradeDocRef.id,
    trade: { id: tradeDocRef.id, ...tradeWithTimestamp },
    violations,
    newScore,
    newZone,
    newState,
    activeConstraints: newConstraints,
    isViolationTrade,
    // NOTE: intentionally the pre-update value — the evaluate route has
    // always returned the stale read here and the UI depends on it.
    reflectionGatePending: discipline?.reflectionGatePending ?? false,
    consecutiveCleanDays: discipline?.consecutiveCleanDays ?? 0,
    historical,
  };
}

// ---------------------------------------------------------------------------
// Batch ingestion (EA sync / imports)
// ---------------------------------------------------------------------------

export interface BatchTradeStatus {
  externalId: string;
  status: "created" | "duplicate" | "error";
  tradeId?: string;
  historical?: boolean;
  violationCount?: number;
  error?: string;
}

export interface ImportBatchResult {
  statuses: BatchTradeStatus[];
  created: number;
  duplicates: number;
  errors: number;
  newScore: number;
  newZone: DisciplineZone;
}

function sanitizeExternalId(externalId: string): string {
  return externalId.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64);
}

export function externalDocId(externalId: string): string {
  return `ext_${sanitizeExternalId(externalId)}`;
}

/**
 * Ingest a chronologically ordered batch of externally executed trades.
 * Each trade must carry `externalId`. Defers stats + session snapshots to
 * one recompute at the end; call with `finalizeStats: false` for all but
 * the last chunk of a multi-request batch.
 */
export async function ingestImportBatch(
  ctx: PulseContext,
  trades: TradeCreateData[],
  opts: { liveCutoffDate: string; finalizeStats?: boolean },
): Promise<ImportBatchResult> {
  const { firestoreId, pulse } = ctx;

  // Defensive chronological sort — the engine assumes session order.
  const sorted = [...trades].sort((a, b) =>
    a.date !== b.date
      ? a.date.localeCompare(b.date)
      : (a.execution.exitTime ?? "").localeCompare(b.execution.exitTime ?? "") ||
        (a.externalId ?? "").localeCompare(b.externalId ?? ""),
  );

  // One range query up front for per-day replay context (counts + risk
  // breaches of already-stored trades), instead of one query per trade.
  const byDate = new Map<string, { count: number; riskBreaches: number }>();
  if (sorted.length > 0) {
    const minDate = sorted[0].date;
    const maxDate = sorted[sorted.length - 1].date;
    const existingSnap = await adminDb
      .collection("pulses")
      .doc(firestoreId)
      .collection("trades")
      .where("date", ">=", minDate)
      .where("date", "<=", maxDate)
      .get();
    for (const doc of existingSnap.docs) {
      const t = doc.data();
      const entry = byDate.get(t.date) ?? { count: 0, riskBreaches: 0 };
      entry.count += 1;
      entry.riskBreaches += (
        (t.engineMetrics?.violations as Array<{ type: string }>) ?? []
      ).filter((v) => v.type === "RISK_PER_TRADE").length;
      byDate.set(t.date, entry);
    }
  }

  const statuses: BatchTradeStatus[] = [];
  const affectedDates = new Set<string>();

  for (const tradeData of sorted) {
    const externalId = tradeData.externalId ?? "";
    if (!externalId) {
      statuses.push({
        externalId,
        status: "error",
        error: "Missing externalId",
      });
      continue;
    }

    const day = byDate.get(tradeData.date) ?? { count: 0, riskBreaches: 0 };

    try {
      const result = await ingestTrade(
        ctx,
        { tradeData },
        {
          mode: "import",
          liveCutoffDate: opts.liveCutoffDate,
          suppressNotifications: true,
          deterministicDocId: externalDocId(externalId),
          skipStatsAndSession: true,
          dailyContext: {
            dailyTradeCount: day.count,
            riskBreachesToday: day.riskBreaches,
          },
        },
      );

      if (result.ok) {
        day.count += 1;
        day.riskBreaches += result.violations.filter(
          (v) => v.type === ViolationType.RISK_PER_TRADE,
        ).length;
        byDate.set(tradeData.date, day);
        affectedDates.add(tradeData.date);
        statuses.push({
          externalId,
          status: "created",
          tradeId: result.tradeId,
          historical: result.historical,
          violationCount: result.violations.length,
        });
      } else if (result.code === "DUPLICATE") {
        statuses.push({ externalId, status: "duplicate" });
      } else {
        statuses.push({
          externalId,
          status: "error",
          error: String(result.payload.error ?? result.code),
        });
      }
    } catch (e) {
      statuses.push({
        externalId,
        status: "error",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  if (opts.finalizeStats !== false) {
    await finalizeBatch(ctx, affectedDates);
  }

  const score = pulse.discipline?.disciplineScore ?? 100;
  return {
    statuses,
    created: statuses.filter((s) => s.status === "created").length,
    duplicates: statuses.filter((s) => s.status === "duplicate").length,
    errors: statuses.filter((s) => s.status === "error").length,
    newScore: score,
    newZone: getZone(score),
  };
}

/** Full-scan stats recompute + session snapshot upserts for the given dates. */
export async function finalizeBatch(
  ctx: PulseContext,
  affectedDates: Set<string>,
): Promise<void> {
  const { firestoreId, pulse } = ctx;

  const newStats = await recalculateStatsFromScan(firestoreId);
  pulse.stats = newStats;

  if (affectedDates.size === 0) return;

  // Recompute each affected session from ALL trades of that date
  // (mirrors scripts/backfill-sessions.ts). disciplineScoreAfter on
  // backfilled dates is the current score — same documented approximation
  // as the backfill script.
  const score = pulse.discipline?.disciplineScore ?? 100;
  const zone = getZone(score);
  const batch = adminDb.batch();

  for (const date of affectedDates) {
    const daySnap = await adminDb
      .collection("pulses")
      .doc(firestoreId)
      .collection("trades")
      .where("date", "==", date)
      .get();
    const dayTrades = daySnap.docs.map((d) => d.data());
    if (dayTrades.length === 0) continue;

    const snapshot: SessionSnapshot = {
      date,
      tradeCount: dayTrades.length,
      wins: dayTrades.filter((t) => t.outcome === "Win").length,
      losses: dayTrades.filter((t) => t.outcome === "Loss").length,
      totalPnL: dayTrades.reduce((s, t) => s + (t.performance?.profitLoss ?? 0), 0),
      disciplineScoreAfter: score,
      zone,
      hasViolations: dayTrades.some(
        (t) => ((t.engineMetrics?.violations as unknown[]) ?? []).length > 0,
      ),
      engagementScore: computeEngagementCredit(dayTrades),
      updatedAt: admin.firestore.Timestamp.now(),
    };

    batch.set(
      adminDb
        .collection("pulses")
        .doc(firestoreId)
        .collection("sessions")
        .doc(date),
      snapshot,
    );
  }

  await batch.commit();
}

// ---------------------------------------------------------------------------
// Stats recalculation
// ---------------------------------------------------------------------------

/** Incremental single-trade stats update — interactive path only. */
async function recalculateStatsIncremental(
  firestoreId: string,
  pulse: Pulse,
  newTrade: TradeCreateData,
): Promise<PulseStats> {
  const prev = pulse.stats ?? {
    totalTrades: 0, wins: 0, losses: 0,
    strikeRate: 0, totalProfitLoss: 0,
    averageWin: 0, averageLoss: 0, profitFactor: 0,
  };

  const pnl       = newTrade.performance.profitLoss;
  const outcome   = newTrade.outcome;
  const totalTrades     = prev.totalTrades + 1;
  const wins            = prev.wins      + (outcome === "Win"  ? 1 : 0);
  const losses          = prev.losses    + (outcome === "Loss" ? 1 : 0);
  const totalProfitLoss = prev.totalProfitLoss + pnl;

  // Re-derive running win/loss totals from previous averages + new trade
  const prevWinTotal  = prev.averageWin  * prev.wins;
  const prevLossTotal = prev.averageLoss * prev.losses;
  const newWinTotal   = prevWinTotal  + (outcome === "Win"  ? pnl          : 0);
  const newLossTotal  = prevLossTotal + (outcome === "Loss" ? Math.abs(pnl) : 0);

  const stats: PulseStats = {
    totalTrades,
    wins,
    losses,
    strikeRate:      totalTrades > 0 ? (wins / totalTrades) * 100 : 0,
    totalProfitLoss,
    averageWin:      wins   > 0 ? newWinTotal  / wins   : 0,
    averageLoss:     losses > 0 ? newLossTotal / losses : 0,
    profitFactor:    newLossTotal > 0 ? newWinTotal / newLossTotal : 0,
  };

  await adminDb.collection("pulses").doc(firestoreId).update({ stats });
  return stats;
}

/** Full recompute from a trade scan — the only safe path after a batch. */
export async function recalculateStatsFromScan(
  firestoreId: string,
): Promise<PulseStats> {
  const tradesSnap = await adminDb
    .collection("pulses")
    .doc(firestoreId)
    .collection("trades")
    .get();

  let wins = 0, losses = 0, totalProfitLoss = 0, winTotal = 0, lossTotal = 0;
  for (const doc of tradesSnap.docs) {
    const t = doc.data();
    const pnl = t.performance?.profitLoss ?? 0;
    totalProfitLoss += pnl;
    if (t.outcome === "Win") { wins += 1; winTotal += pnl; }
    else if (t.outcome === "Loss") { losses += 1; lossTotal += Math.abs(pnl); }
  }
  const totalTrades = tradesSnap.size;

  const stats: PulseStats = {
    totalTrades,
    wins,
    losses,
    strikeRate:      totalTrades > 0 ? (wins / totalTrades) * 100 : 0,
    totalProfitLoss,
    averageWin:      wins   > 0 ? winTotal  / wins   : 0,
    averageLoss:     losses > 0 ? lossTotal / losses : 0,
    profitFactor:    lossTotal > 0 ? winTotal / lossTotal : 0,
  };

  await adminDb.collection("pulses").doc(firestoreId).update({ stats });
  return stats;
}
