/**
 * POST /api/discipline/evaluate
 *
 * Phase 2 server-side discipline evaluation endpoint.
 * All violation detection, score mutation, and trade persistence runs here.
 * The client MUST NOT compute discipline state — it only reads it.
 *
 * Request body: { pulseId, userId, tradeData }
 * Auth: Firebase ID token in Authorization header
 *
 * Flow:
 *  1. Verify auth (Firebase ID token)
 *  2. Read Pulse document
 *  3. Validate trade data
 *  4. Run lazy session recovery (if new day)
 *  5. Evaluate violations via disciplineEngine
 *  6. Compute engineMetrics
 *  7. Write trade document + violation log + discipline score
 *  8. Update daily loss, total drawdown, pulse stats
 *  9. Return { trade, violations, newScore, newZone }
 */

import { NextResponse } from "next/server";
import { adminDb } from "@/services/admin";
import * as admin from "firebase-admin";
import type { Pulse, Trade, TradeRule } from "@/types/pulse";
import { PULSE_STATUS, isPulseLocked, PULSE_MESSAGES } from "@/types/pulse";
import type { TradeCreateData } from "@/services/api/pulseApi";
import {
  evaluateViolations,
  applyScorePenalties,
  getZone,
  computeRecovery,
} from "@/lib/disciplineEngine";
import type {
  EvaluationContext,
  TradeForEvaluation,
  TradeEngineMetrics,
  SessionSummary,
  ViolationLogEntry,
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
// Auth helper
// ---------------------------------------------------------------------------

async function verifyAuth(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    const decoded = await admin.auth().verifyIdToken(token, true);
    return decoded.uid;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────
    const authenticatedUid = await verifyAuth(request);
    if (!authenticatedUid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { pulseId, userId, tradeData, noTradeDayAck, capAck } = body as {
      pulseId: string;
      userId: string;
      tradeData: TradeCreateData;
      noTradeDayAck?: boolean;
      capAck?: boolean;
    };

    // Verify the authenticated user matches the request
    if (authenticatedUid !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── Read Pulse ─────────────────────────────────────────────────────
    const pulsesSnap = await adminDb
      .collection("pulses")
      .where("id", "==", pulseId)
      .where("userId", "==", userId)
      .limit(1)
      .get();

    if (pulsesSnap.empty) {
      return NextResponse.json({ error: "Pulse not found" }, { status: 404 });
    }

    const pulseDoc = pulsesSnap.docs[0];
    const pulseData = pulseDoc.data() as Pulse;
    const firestoreId = pulseDoc.id;

    if (isPulseLocked(pulseData)) {
      if (pulseData.status !== PULSE_STATUS.LOCKED) {
        // Lazy migration: Update status in Firestore for legacy pulses that breached before the new logic
        await adminDb.collection("pulses").doc(firestoreId).update({
          status: PULSE_STATUS.LOCKED,
        });
      }

      return NextResponse.json(
        { error: PULSE_MESSAGES.LOCKED_ERROR_MESSAGE },
        { status: 403 },
      );
    }

    // ── Friction gate checks ───────────────────────────────────────────
    // Extract discipline early so gate checks can run before expensive ops.
    const discipline = pulseData.discipline;
    const calendarToday = new Date().toISOString().split("T")[0];
    const earlyConstraints: ActiveConstraints = discipline?.activeConstraints ?? {
      riskCapPct: null, tradeCapCount: null, lockoutUntil: null, noTradeDays: 0, cleanSessionsToLift: 0,
    };
    const hasAnyCaps =
      earlyConstraints.riskCapPct !== null ||
      earlyConstraints.tradeCapCount !== null ||
      earlyConstraints.noTradeDays > 0;

    // Tier 2/3: Session gate must be acknowledged before any trade on a constrained day.
    if (hasAnyCaps && discipline?.sessionGateAckDate !== calendarToday) {
      return NextResponse.json({ error: "SESSION_GATE_NOT_ACKNOWLEDGED" }, { status: 403 });
    }

    // Tier 3: No-trade day — requires explicit per-trade typed acknowledgement.
    if (earlyConstraints.noTradeDays > 0 && !noTradeDayAck) {
      return NextResponse.json({
        error: "NO_TRADE_DAY_ACK_REQUIRED",
        daysRemaining: earlyConstraints.noTradeDays,
      }, { status: 409 });
    }

    // ── Validate trade data ────────────────────────────────────────────
    if (
      !tradeData.instrument ||
      !tradeData.execution.lotSize ||
      !tradeData.execution.entryPrice ||
      !tradeData.execution.exitPrice ||
      !tradeData.execution.entryReason
    ) {
      return NextResponse.json(
        { error: "Missing required trade fields" },
        { status: 400 },
      );
    }

    if (
      tradeData.execution.entryTime &&
      tradeData.execution.exitTime &&
      tradeData.execution.entryTime > tradeData.execution.exitTime
    ) {
      return NextResponse.json(
        { error: "Entry time must be earlier than exit time" },
        { status: 400 },
      );
    }

    // Price vs P/L consistency check
    const priceDiff =
      tradeData.execution.exitPrice - tradeData.execution.entryPrice;
    const expectedProfitable =
      (tradeData.type === "Buy" && priceDiff > 0) ||
      (tradeData.type === "Sell" && priceDiff < 0);
    const isProfitable = tradeData.performance.profitLoss > 0;

    if (isProfitable !== expectedProfitable && tradeData.performance.profitLoss !== 0) {
      return NextResponse.json(
        {
          error: `P/L doesn't match entry/exit prices. For a ${tradeData.type} trade with entry at ${tradeData.execution.entryPrice} and exit at ${tradeData.execution.exitPrice}, the P/L should ${expectedProfitable ? "be positive" : "be negative"}`,
        },
        { status: 400 },
      );
    }

    // ── Session context ────────────────────────────────────────────────
    const today = new Date(tradeData.date).toISOString().split("T")[0];
    const dailyLosses: number = pulseData.dailyLoss?.[today] || 0;

    // Daily drawdown check (non-blocking in Phase 2 — engine handles escalation)
    // We no longer hard-block here; the engine detects and scores it.

    // Count today's trades
    const todayTradesSnap = await adminDb
      .collection("pulses")
      .doc(firestoreId)
      .collection("trades")
      .where("date", "==", today)
      .get();
    const dailyTradeCount = todayTradesSnap.size;

    // ── Lazy recovery ──────────────────────────────────────────────────
    // (discipline extracted earlier for gate checks)
    const lastSessionDate = discipline?.lastSessionDate ?? null;
    const isNewDay = lastSessionDate !== null && lastSessionDate !== today;

    if (isNewDay && discipline && dailyTradeCount === 0) {
      // ── Weekly breach count reset (Monday boundary) ────────────────
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
        });
        discipline.weeklyBreachCounts = resetCounts;
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
      const existingConstraints = discipline.activeConstraints ?? {
        riskCapPct: null, tradeCapCount: null, lockoutUntil: null, noTradeDays: 0, cleanSessionsToLift: 0,
      };
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

      const hasFullJournal = prevTrades.some(
        (t) =>
          typeof t.reflection?.whatILearned === "string" &&
          (t.reflection.whatILearned as string).trim().length > 50,
      );

      const prevSession: SessionSummary = {
        tradeCount: prevTrades.length,
        hasViolations: prevHasViolations,
        allRequiredRulesFollowed: allRequiredFollowed,
        hasFullJournal,
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
        // TODO
        // const recoveredZone = getZone(recoveredScore);
        const recoveredState = computeStateTransition(
          discipline.disciplineState ?? "NORMAL",
          recoveredScore,
          discipline.activeConstraints ?? {
            riskCapPct: null, tradeCapCount: null, lockoutUntil: null, noTradeDays: 0, cleanSessionsToLift: 0,
          },
        );
        await adminDb.collection("pulses").doc(firestoreId).update({
          "discipline.disciplineScore": recoveredScore,
          "discipline.disciplineState": recoveredState,
        });
        discipline.disciplineScore = recoveredScore;
        discipline.disciplineState = recoveredState;
      }
    }

    // ── Risk breach count ──────────────────────────────────────────────
    const riskBreachesToday = todayTradesSnap.docs.reduce((count, d) => {
      const t = d.data();
      return (
        count +
        ((t.engineMetrics?.violations as Array<{ type: string }>) ?? []).filter(
          (v) => v.type === "RISK_PER_TRADE",
        ).length
      );
    }, 0);

    // ── Build evaluation context ───────────────────────────────────────
    const defaultConstraints = {
      riskCapPct: null,
      tradeCapCount: null,
      lockoutUntil: null,
      noTradeDays: 0,
      cleanSessionsToLift: 0,
    };
    const currentConstraints = discipline?.activeConstraints ?? defaultConstraints;

    const ctx: EvaluationContext = {
      accountSize: pulseData.accountSize,
      maxRiskPerTrade: pulseData.maxRiskPerTrade,
      maxDailyDrawdown: pulseData.maxDailyDrawdown,
      maxTotalDrawdown: pulseData.maxTotalDrawdown,
      maxTradesPerDay: discipline?.maxTradesPerDay ?? null,
      tradingRules: pulseData.tradingRules ?? [],
      dailyTradeCount,
      dailyLossSoFar: Math.abs(dailyLosses),
      totalDrawdown: pulseData.totalDrawdown ?? 0,
      riskBreachesToday,
      activeConstraints: currentConstraints,
    };

    // ── Compute risk from SL ───────────────────────────────────────────
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

    // ── Tier 2 cap enforcement ─────────────────────────────────────────
    // Risk cap: if active and trade risk exceeds the cap, require capAck.
    if (currentConstraints.riskCapPct !== null && !capAck) {
      const effectiveCap = pulseData.maxRiskPerTrade * currentConstraints.riskCapPct;
      if (riskPctFromSL > effectiveCap) {
        return NextResponse.json({
          error: "RISK_CAP_EXCEEDED",
          cap: effectiveCap,
          actual: riskPctFromSL,
        }, { status: 422 });
      }
    }
    // Trade cap: if active and daily count already at limit, require capAck.
    if (currentConstraints.tradeCapCount !== null && !capAck) {
      if (dailyTradeCount >= currentConstraints.tradeCapCount) {
        return NextResponse.json({
          error: "TRADE_CAP_EXCEEDED",
          cap: currentConstraints.tradeCapCount,
          count: dailyTradeCount,
        }, { status: 422 });
      }
    }

    const tradeForEval: TradeForEvaluation = {
      riskPct: riskPctFromSL,
      profitLoss: tradeData.performance.profitLoss,
      followedRules: tradeData.followedRules ?? [],
    };

    // ── Evaluate violations ────────────────────────────────────────────
    const violations = evaluateViolations(tradeForEval, ctx);

    // ── Compute engine metrics ─────────────────────────────────────────
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

    // ── Write trade document ───────────────────────────────────────────
    const tradeWithTimestamp = {
      ...tradeData,
      engineMetrics,
      createdAt: admin.firestore.Timestamp.now(),
    };

    const tradeDocRef = await adminDb
      .collection("pulses")
      .doc(firestoreId)
      .collection("trades")
      .add(tradeWithTimestamp);

    // ── Write violation log ────────────────────────────────────────────
    if (violations.length > 0) {
      const violationLogRef = adminDb
        .collection("pulses")
        .doc(firestoreId)
        .collection("violationLog");
      const scoreBefore = discipline?.disciplineScore ?? 100;
      let runningScore = scoreBefore;

      const batch = adminDb.batch();
      for (const violation of violations) {
        const scoreAfter = Math.max(0, runningScore - violation.severity);
        const entry: ViolationLogEntry = {
          timestamp: admin.firestore.Timestamp.now(),
          sessionDate: today,
          tradeId: tradeDocRef.id,
          violation,
          scoreBefore: runningScore,
          scoreAfter,
          zone: getZone(runningScore),
        };
        runningScore = scoreAfter;
        batch.set(violationLogRef.doc(), entry);
      }
      await batch.commit();
    }

    // ── Update daily loss ──────────────────────────────────────────────
    if (tradeData.performance.profitLoss < 0) {
      await adminDb
        .collection("pulses")
        .doc(firestoreId)
        .update({
          [`dailyLoss.${today}`]:
            (dailyLosses || 0) + Math.abs(tradeData.performance.profitLoss),
        });
    }

    // ── Update total drawdown ──────────────────────────────────────────
    const totalDrawdown = pulseData.totalDrawdown || 0;
    if (tradeData.performance.profitLoss < 0) {
      const newTotalDrawdown =
        totalDrawdown + Math.abs(tradeData.performance.profitLoss);
      await adminDb.collection("pulses").doc(firestoreId).update({
        totalDrawdown: newTotalDrawdown,
      });
    }

    // ── Update discipline score + enforcement ──────────────────────────
    let newScore = discipline?.disciplineScore ?? 100;
    let newZone = getZone(newScore);
    let newConstraints: ActiveConstraints = currentConstraints;
    let newState: DisciplineState = discipline?.disciplineState ?? "NORMAL";
    let isViolationTrade = false;

    // Flag if trading under no-trade-day (acknowledged via noTradeDayAck)
    if (currentConstraints.noTradeDays > 0 && noTradeDayAck) {
      isViolationTrade = true;
      // Inject NO_TRADE_DAY_VIOLATED into violations so the engine scores it
      violations.push({
        type: ViolationType.NO_TRADE_DAY_VIOLATED,
        category: ViolationCategory.QUANTITATIVE,
        severity: 20,
        details: `Trade logged on a mandated no-trade day (${currentConstraints.noTradeDays} day${currentConstraints.noTradeDays > 1 ? "s" : ""} remaining).`,
        threshold: 0,
        actual: 1,
      });
    }

    if (discipline && violations.length > 0) {
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

      // ── Compute enforcement constraints ────────────────────────────
      // Pass currentConstraints so escalation can fire when an existing cap
      // is active even after the weekly counter reset.
      const { constraints: incomingConstraints, reflectionGatePending, isLockedPermanently } =
        computeConstraints(
          violations,
          updatedCounts,
          discipline.maxTradesPerDay ?? null,
          currentConstraints,
        );
      newConstraints = mergeConstraints(currentConstraints, incomingConstraints);
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
          // Reset streak — any violation day breaks the consecutive clean chain
          "discipline.consecutiveCleanDays": 0,
        });
      // Mirror in memory so streak is consistent for the rest of this request
      discipline.consecutiveCleanDays = 0;

      if (isLockedPermanently) {
        await adminDb.collection("pulses").doc(firestoreId).update({
          status: PULSE_STATUS.LOCKED,
        });

        // ── Tier 2 notifications: terminal lockout ─────────────────────
        const partnerEmail = discipline.accountabilityPartnerEmail;
        const traderEmail = pulseData.userId; // resolved to email below (best-effort)
        if (partnerEmail) {
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

      // ── Tier 2: Daily drawdown alert ────────────────────────────────
      const hasDailyDrawdownBreach = violations.some(
        (v) => v.type === "DAILY_DRAWDOWN",
      );
      if (hasDailyDrawdownBreach && discipline.accountabilityPartnerEmail) {
        void sendPartnerAlert({
          partnerEmail: discipline.accountabilityPartnerEmail,
          traderName: pulseData.userId,
          pulseName: pulseData.name,
          breachType: "DAILY_DRAWDOWN",
          disciplineScore: newScore,
          details: "Daily drawdown limit hit.",
        });
        void sendPartnerAlertSMS({
          to: "",
          traderName: pulseData.userId,
          pulseName: pulseData.name,
          breachType: "DAILY_DRAWDOWN",
        });
      }

      // ── Tier 1: WHY reminder on zone degradation ─────────────────────
      const prevZone = getZone(discipline.disciplineScore ?? 100);
      const zoneWorsened =
        (prevZone === "GREEN" && (newZone === "YELLOW" || newZone === "RED")) ||
        (prevZone === "YELLOW" && newZone === "RED");
      if (zoneWorsened && pulseData.userId) {
        // Fire-and-forget — fetch trader email from Admin Auth
        void admin.auth().getUser(pulseData.userId).then((userRecord) => {
          if (userRecord.email && newZone !== "GREEN") {
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

    } else if (discipline) {
      // Clean trade — update last session date, compute state
      newState = computeStateTransition(
        discipline.disciplineState ?? "NORMAL",
        newScore,
        currentConstraints,
      );
      await adminDb.collection("pulses").doc(firestoreId).update({
        "discipline.lastSessionDate": today,
        "discipline.disciplineState": newState,
      });
    }

    // ── Recalculate pulse stats ────────────────────────────────────────
    await recalculateStats(firestoreId);

    // ── Response ───────────────────────────────────────────────────────
    const tradeResult = {
      id: tradeDocRef.id,
      ...tradeWithTimestamp,
    };

    return NextResponse.json({
      success: true,
      data: {
        trade: tradeResult,
        violations,
        newScore,
        newZone,
        newState,
        activeConstraints: newConstraints,
        isViolationTrade,
        reflectionGatePending: discipline?.reflectionGatePending ?? false,
        consecutiveCleanDays: discipline?.consecutiveCleanDays ?? 0,
      },
    });
  } catch (error) {
    console.error("Discipline evaluate error:", error);
    return NextResponse.json(
      {
        error: "Failed to evaluate trade",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Stats recalculation (server-side, uses adminDb)
// ---------------------------------------------------------------------------

async function recalculateStats(firestoreId: string) {
  const tradesSnap = await adminDb
    .collection("pulses")
    .doc(firestoreId)
    .collection("trades")
    .get();

  if (tradesSnap.empty) {
    await adminDb
      .collection("pulses")
      .doc(firestoreId)
      .update({
        stats: {
          totalTrades: 0,
          wins: 0,
          losses: 0,
          strikeRate: 0,
          totalProfitLoss: 0,
          averageWin: 0,
          averageLoss: 0,
          profitFactor: 0,
        },
      });
    return;
  }

  const trades = tradesSnap.docs.map((d) => d.data()) as Trade[];
  let wins = 0,
    losses = 0,
    totalProfitLoss = 0,
    totalWinAmount = 0,
    totalLossAmount = 0;

  for (const trade of trades) {
    if (trade.outcome === "Win") {
      wins++;
      totalWinAmount += trade.performance.profitLoss;
    } else if (trade.outcome === "Loss") {
      losses++;
      totalLossAmount += Math.abs(trade.performance.profitLoss);
    }
    totalProfitLoss += trade.performance.profitLoss;
  }

  const totalTrades = trades.length;
  await adminDb
    .collection("pulses")
    .doc(firestoreId)
    .update({
      stats: {
        totalTrades,
        wins,
        losses,
        strikeRate: totalTrades > 0 ? (wins / totalTrades) * 100 : 0,
        totalProfitLoss,
        averageWin: wins > 0 ? totalWinAmount / wins : 0,
        averageLoss: losses > 0 ? totalLossAmount / losses : 0,
        profitFactor: totalLossAmount > 0 ? totalWinAmount / totalLossAmount : 0,
      },
    });
}
