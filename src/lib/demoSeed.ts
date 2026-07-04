/**
 * Demo account — deterministic sample-data generator.
 *
 * Pure module: no Firestore imports. Produces plain document objects for the
 * shared demo account, with all dates generated RELATIVE to `today` so the
 * demo always looks freshly traded. A seeded PRNG keeps prices/times stable
 * across re-seeds (screenshots stay consistent).
 *
 * Consumed by:
 *  - src/lib/demoSeedWriter.ts   (API route + CLI script write path)
 *
 * Narrative:
 *  - Pulse 1 "NQ Momentum"  — the aspirational pulse. GREEN zone, profitable,
 *    thorough journaling, long clean streak. Two small historical dips show
 *    the score recovering.
 *  - Pulse 2 "Gold Scalps"  — the discipline-engine showcase. Risk breaches,
 *    a daily-drawdown day and rule misses walk the score down to YELLOW with
 *    an active 50% risk cap + NTD warning (tier 3 warn state).
 */

import {
  ViolationCategory,
  ViolationType,
  type PulseDisciplineFields,
  type TradeViolation,
} from "./disciplineTypes";
import { getZone } from "./disciplineEngine";

// ---------------------------------------------------------------------------
// Public constants
// ---------------------------------------------------------------------------

export const DEMO_EMAIL = "demo@profitpulse.app";
export const DEMO_DISPLAY_NAME = "Demo Trader";
export const DEMO_PULSE_DOC_IDS = ["demo-pulse-1", "demo-pulse-2"] as const;

export const DEMO_JOURNAL_TEXT =
  "Grateful for the chance to explore ProfitPulse today. Trading well starts " +
  "with showing up deliberately — one honest journal entry at a time.";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Converts a JS Date into the caller's Timestamp type (admin SDK at runtime). */
export type TimestampFactory = (d: Date) => unknown;

export interface DemoDocSeed {
  docId: string;
  data: Record<string, unknown>;
}

export interface DemoPulseSeed {
  docId: string;
  pulse: Record<string, unknown>;
  trades: DemoDocSeed[];
  violationLog: Record<string, unknown>[];
  sessions: DemoDocSeed[];
}

export interface DemoSeedData {
  user: Record<string, unknown>;
  pulses: DemoPulseSeed[];
  journal: DemoDocSeed[];
}

// ---------------------------------------------------------------------------
// Deterministic PRNG (mulberry32)
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Date helpers (UTC, matching the app's utcDayKey convention)
// ---------------------------------------------------------------------------

/** Most recent `count` weekdays ending at (or before) `today`. Index 0 = latest. */
function lastWeekdays(today: Date, count: number): string[] {
  const days: string[] = [];
  const d = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  while (days.length < count) {
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) days.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return days;
}

function daysAgo(today: Date, n: number): Date {
  const d = new Date(today.getTime());
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

/** Human pulse id, mirroring pulseService.createPulse's generator. */
function humanPulseId(name: string, createdAt: Date): string {
  const prefix = name.slice(0, 4).toUpperCase().replace(/\s+/g, "");
  const dd = String(createdAt.getUTCDate()).padStart(2, "0");
  const mm = String(createdAt.getUTCMonth() + 1).padStart(2, "0");
  const yy = String(createdAt.getUTCFullYear()).slice(-2);
  return `${prefix}${dd}${mm}${yy}`;
}

// ---------------------------------------------------------------------------
// Instruments
// ---------------------------------------------------------------------------

interface InstrumentSpec {
  base: number;
  jitter: number;
  tick: number;
  pointValue: number;
}

const INSTRUMENTS: Record<string, InstrumentSpec> = {
  NQ: { base: 21500, jitter: 350, tick: 0.25, pointValue: 20 },
  ES: { base: 6050, jitter: 90, tick: 0.25, pointValue: 50 },
  GC: { base: 3350, jitter: 55, tick: 0.1, pointValue: 100 },
};

function roundTick(price: number, tick: number): number {
  return Math.round(Math.round(price / tick) * tick * 100) / 100;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// Content pools
// ---------------------------------------------------------------------------

const ENTRY_REASONS = [
  "Break and retest of overnight high with strong volume confirmation",
  "Pullback to the 20 EMA in an established uptrend, bullish engulfing on the 5m",
  "Failed breakdown at yesterday's low — took the reclaim long",
  "Opening range breakout with market internals aligned",
  "Liquidity sweep of the session low followed by displacement candle",
  "Retest of broken resistance turned support at a key level",
  "Trend continuation after a tight consolidation flag",
  "Rejection wick at the value area high — faded back to VWAP",
  "Second entry after the first push confirmed direction",
  "News-drive momentum aligned with the higher-timeframe bias",
];

const LEARNINGS = [
  "Patience at the level paid off — waiting for confirmation kept me out of the chop.",
  "Sized correctly and the trade never felt stressful. Repeat this.",
  "Exited a touch early; the plan said hold to target. Trust the plan.",
  "Good read on market context. The morning bias held all session.",
  "Should have taken partials at 1R — gave back open profit on the reversal.",
  "Entry was solid but the stop was tighter than the structure required.",
  "Skipped the revenge trade urge after the stop-out. Win for discipline.",
  "The setup was B-grade at best. Only A-setups going forward.",
];

const IMPROVEMENTS = [
  "Set an alert at the level instead of watching every tick.",
  "Take partials at 1R and let the rest run to target.",
  "Wait for the candle close before entering, not mid-bar.",
  "Cut position size after two losses in a day.",
  "Do the pre-market checklist before the open, every day.",
];

const MISTAKES = [
  ["Entered before confirmation", "Moved stop to breakeven too early"],
  ["Chased the entry after the initial move"],
  ["Oversized relative to the setup quality"],
  ["Ignored the higher-timeframe resistance overhead"],
  ["Traded through lunch chop against the plan"],
];

const JOURNAL_TEXTS = [
  "Grateful for a clear head this morning. The goal today is simple: follow the plan, respect the stop, and let the market do the rest.",
  "Thankful for yesterday's lesson — a small loss taken correctly is a win for the process.",
  "Feeling focused. Slept well, prepped the levels last night. Quality over quantity today.",
  "Grateful for my trading routine. The checklist keeps me honest when the market gets loud.",
  "Reminding myself why I trade: freedom, mastery, and providing for my family. Rules first.",
  "Thankful for a green week so far, but staying humble — the market punishes autopilot.",
  "A little tired today. Cutting size in half and only taking A-setups.",
  "Grateful for the discipline engine keeping score. It's easier to be honest when the data is.",
  "New week, fresh slate. One good trade at a time.",
  "Thankful for the losses that taught me position sizing. Risk small, think big.",
  "Focused on execution today, not P/L. The money follows the process.",
  "Grateful to be trading at all — reviewing old journals shows how far the process has come.",
];

// ---------------------------------------------------------------------------
// Day-plan DSL
// ---------------------------------------------------------------------------

type Engagement = "rich" | "medium" | "sparse";

interface TradePlan {
  /** target result in R-multiples (0 = break-even scratch) */
  r: number;
  /** intended risk in dollars */
  risk: number;
  /** planned reward:risk */
  rr: number;
  /** rule ids missed on this trade (drives followedRules + qualitative violations) */
  missed?: string[];
  /** quantitative violations attached to this trade */
  violations?: TradeViolation[];
  instrument?: string;
}

interface DayPlan {
  /** weekday offset back from the latest weekday (0 = latest) */
  off: number;
  trades: TradePlan[];
  /** end-of-day discipline score (scripted trajectory) */
  score: number;
}

function qv(
  type: ViolationType,
  severity: number,
  details: string,
  threshold: number,
  actual: number,
): TradeViolation {
  return {
    type,
    category: ViolationCategory.QUANTITATIVE,
    severity,
    details,
    threshold,
    actual,
  };
}

function rv(
  type: ViolationType,
  severity: number,
  details: string,
  ruleId?: string,
): TradeViolation {
  return {
    type,
    category: ViolationCategory.QUALITATIVE,
    severity,
    details,
    threshold: 0,
    actual: 0,
    ...(ruleId ? { ruleId } : {}),
  };
}

// ---------------------------------------------------------------------------
// Trade document builder
// ---------------------------------------------------------------------------

interface PulseConfig {
  docId: string;
  name: string;
  accountSize: number;
  maxRiskPerTrade: number;
  maxDailyDrawdown: number;
  maxTotalDrawdown: number;
  maxTradesPerDay: number | null;
  instruments: string[];
  rules: { id: string; description: string; isRequired: boolean }[];
  whyStatement: string;
  whyDiscipline: string;
  engagement: Engagement;
  createdDaysAgo: number;
}

function buildTradeDoc(opts: {
  rng: () => number;
  demoUid: string;
  pulseHumanId: string;
  cfg: PulseConfig;
  date: string;
  plan: TradePlan;
  indexInDay: number;
  toTimestamp: TimestampFactory;
}): Record<string, unknown> {
  const { rng, demoUid, pulseHumanId, cfg, date, plan, indexInDay, toTimestamp } =
    opts;
  const instrument = plan.instrument ?? cfg.instruments[0];
  const spec = INSTRUMENTS[instrument] ?? {
    base: 100,
    jitter: 5,
    tick: 0.01,
    pointValue: 1,
  };

  const type: "Buy" | "Sell" = rng() < 0.55 ? "Buy" : "Sell";
  const dir = type === "Buy" ? 1 : -1;
  const lots = plan.risk > 200 ? 2 : 1;

  const entry = roundTick(spec.base + (rng() * 2 - 1) * spec.jitter, spec.tick);
  let slDist = plan.risk / (spec.pointValue * lots);
  slDist = Math.max(roundTick(slDist, spec.tick), spec.tick);
  const riskDollars = round2(slDist * spec.pointValue * lots);

  const sl = roundTick(entry - dir * slDist, spec.tick);
  const tp = roundTick(entry + dir * slDist * plan.rr, spec.tick);
  const exit =
    plan.r === 0
      ? entry
      : roundTick(entry + dir * slDist * plan.r, spec.tick);

  const pnl = round2((exit - entry) * dir * spec.pointValue * lots);
  const outcome: "Win" | "Loss" | "Break-even" =
    pnl > 0 ? "Win" : pnl < 0 ? "Loss" : "Break-even";
  const actualR = riskDollars > 0 ? round2(pnl / riskDollars) : 0;

  // NY morning session times
  const entryH = 9 + Math.floor(rng() * 2); // 9–10
  const entryM = Math.floor(rng() * 60);
  const durMin = 12 + Math.floor(rng() * 75);
  const entryMinutes = entryH * 60 + entryM;
  const exitMinutes = entryMinutes + durMin;
  const fmt = (mins: number) =>
    `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

  const missed = new Set(plan.missed ?? []);
  const followedRules = cfg.rules
    .filter((r) => !missed.has(r.id))
    .map((r) => r.id);

  // Qualitative violations derived from missed rules
  const ruleViolations: TradeViolation[] = (plan.missed ?? []).map((ruleId) => {
    const rule = cfg.rules.find((r) => r.id === ruleId);
    const required = rule?.isRequired ?? false;
    return rv(
      required
        ? ViolationType.REQUIRED_RULE_MISSED
        : ViolationType.OPTIONAL_RULE_MISSED,
      required ? 4 : 1,
      `${required ? "Required" : "Optional"} rule not followed: ${rule?.description ?? ruleId}`,
      ruleId,
    );
  });

  const violations: TradeViolation[] = [
    ...(plan.violations ?? []),
    ...ruleViolations,
  ];

  const intendedRiskPct = round2((riskDollars / cfg.accountSize) * 100);

  const trade: Record<string, unknown> = {
    pulseId: pulseHumanId,
    userId: demoUid,
    date,
    type,
    instrument,
    outcome,
    execution: {
      entryTime: fmt(entryMinutes),
      exitTime: fmt(exitMinutes),
      lotSize: lots,
      entryPrice: entry,
      exitPrice: exit,
      plannedSL: sl,
      plannedTP: tp,
      entryReason: ENTRY_REASONS[Math.floor(rng() * ENTRY_REASONS.length)],
    },
    performance: {
      profitLoss: pnl,
      profitLossPercentage: round2((pnl / cfg.accountSize) * 100),
    },
    engineMetrics: {
      intendedRiskPct,
      intendedRR: plan.rr,
      actualR,
      exitQuality: plan.rr > 0 ? round2(actualR / plan.rr) : null,
      violations,
    },
    followedRules,
    createdAt: toTimestamp(
      new Date(`${date}T${fmt(exitMinutes)}:00.000Z`),
    ),
  };

  // Engagement sections — rich pulses journal thoroughly, sparse ones barely
  const engaged =
    cfg.engagement === "rich"
      ? rng() < 0.9
      : cfg.engagement === "medium"
        ? rng() < 0.6
        : rng() < 0.35;

  if (engaged || outcome === "Loss") {
    trade.psychology = {
      emotionalState:
        outcome === "Loss"
          ? rng() < 0.5
            ? "Anxious"
            : "Calm"
          : rng() < 0.6
            ? "Confident"
            : "Calm",
      emotionalIntensity: 3 + Math.floor(rng() * 5),
      mentalState: rng() < 0.7 ? "Focused" : "Clear",
      planAdherence:
        violations.length > 0 ? "Partially" : rng() < 0.85 ? "Fully" : "Partially",
      impulsiveEntry: violations.some(
        (v) => v.type === ViolationType.REQUIRED_RULE_MISSED,
      ),
    };
  }
  if (engaged) {
    trade.context = {
      marketCondition: rng() < 0.5 ? "Trending" : rng() < 0.5 ? "Ranging" : "Volatile",
      timeOfDay: "New York open",
      tradingEnvironment: "Home",
    };
    trade.learnings = LEARNINGS[Math.floor(rng() * LEARNINGS.length)];
  }
  if (engaged && (cfg.engagement === "rich" || outcome === "Loss")) {
    trade.reflection = {
      wouldRepeat: outcome !== "Loss" && violations.length === 0,
      emotionalImpact:
        outcome === "Win" ? "Positive" : outcome === "Loss" ? "Negative" : "Neutral",
      ...(outcome === "Loss"
        ? { mistakesIdentified: MISTAKES[Math.floor(rng() * MISTAKES.length)] }
        : {}),
      improvementIdeas: IMPROVEMENTS[Math.floor(rng() * IMPROVEMENTS.length)],
    };
  }

  // Deterministic minor jitter so two trades on the same day differ
  void indexInDay;

  return trade;
}

// ---------------------------------------------------------------------------
// Pulse assembly
// ---------------------------------------------------------------------------

function buildPulseSeed(opts: {
  cfg: PulseConfig;
  dayPlans: DayPlan[];
  weekdays: string[];
  demoUid: string;
  today: Date;
  seed: number;
  finalDiscipline: Partial<PulseDisciplineFields>;
  toTimestamp: TimestampFactory;
}): DemoPulseSeed {
  const { cfg, dayPlans, weekdays, demoUid, today, seed, finalDiscipline, toTimestamp } =
    opts;
  const rng = mulberry32(seed);
  const createdAt = daysAgo(today, cfg.createdDaysAgo);
  const pulseHumanId = humanPulseId(cfg.name, createdAt);

  const trades: DemoDocSeed[] = [];
  const violationLog: Record<string, unknown>[] = [];
  const sessions: DemoDocSeed[] = [];
  const dailyLoss: Record<string, number> = {};

  let totalDrawdown = 0;
  let tradeCounter = 0;
  let runningScore = 100;
  let lastSessionDate: string | null = null;

  // Oldest day first so score bookkeeping runs forward in time
  const orderedPlans = [...dayPlans].sort((a, b) => b.off - a.off);

  for (const day of orderedPlans) {
    const date = weekdays[day.off];
    if (!date) continue;

    const dayTrades: Record<string, unknown>[] = [];
    let dayLoss = 0;

    day.trades.forEach((plan, i) => {
      tradeCounter += 1;
      const docId = `${cfg.docId}-t${String(tradeCounter).padStart(2, "0")}`;
      const trade = buildTradeDoc({
        rng,
        demoUid,
        pulseHumanId,
        cfg,
        date,
        plan,
        indexInDay: i,
        toTimestamp,
      });
      trades.push({ docId, data: trade });
      dayTrades.push(trade);

      const pnl = (trade.performance as { profitLoss: number }).profitLoss;
      if (pnl < 0) {
        dayLoss += Math.abs(pnl);
        totalDrawdown += Math.abs(pnl);
      }

      // Violation log entries — running score decreases per violation,
      // then the scripted day-end score absorbs recovery/rounding.
      const violations = (
        trade.engineMetrics as { violations: TradeViolation[] }
      ).violations;
      for (const violation of violations) {
        const scoreBefore = runningScore;
        const scoreAfter = Math.max(0, scoreBefore - violation.severity);
        violationLog.push({
          timestamp: toTimestamp(new Date(`${date}T15:${String(10 + violations.indexOf(violation)).padStart(2, "0")}:00.000Z`)),
          sessionDate: date,
          tradeId: docId,
          violation,
          scoreBefore,
          scoreAfter,
          zone: getZone(scoreBefore),
        });
        runningScore = scoreAfter;
      }
    });

    if (dayLoss > 0) dailyLoss[date] = round2(dayLoss);

    // Snap to the scripted end-of-day score (models recovery credits)
    runningScore = day.score;
    lastSessionDate = date;

    const wins = dayTrades.filter((t) => t.outcome === "Win").length;
    const losses = dayTrades.filter((t) => t.outcome === "Loss").length;
    const totalPnL = round2(
      dayTrades.reduce(
        (s, t) => s + (t.performance as { profitLoss: number }).profitLoss,
        0,
      ),
    );
    const hasViolations = dayTrades.some(
      (t) =>
        ((t.engineMetrics as { violations: unknown[] }).violations ?? []).length >
        0,
    );
    let engagementTotal = 0;
    for (const t of dayTrades) {
      let credit = 0;
      if (t.psychology) credit++;
      if (t.context) credit++;
      if (t.reflection) credit++;
      if (t.learnings) credit++;
      engagementTotal += Math.min(credit, 4);
    }
    const engagementScore = dayTrades.length
      ? Math.min(Math.round(engagementTotal / dayTrades.length), 4)
      : 0;

    sessions.push({
      docId: date,
      data: {
        date,
        tradeCount: dayTrades.length,
        wins,
        losses,
        totalPnL,
        disciplineScoreAfter: day.score,
        zone: getZone(day.score),
        hasViolations,
        engagementScore,
        updatedAt: toTimestamp(new Date(`${date}T21:00:00.000Z`)),
      },
    });
  }

  // Stats — full recompute, mirroring pulseService.calculatePulseStats
  const allPnls = trades.map(
    (t) => (t.data.performance as { profitLoss: number }).profitLoss,
  );
  const winPnls = allPnls.filter((p) => p > 0);
  const lossPnls = allPnls.filter((p) => p < 0);
  const winTotal = winPnls.reduce((s, p) => s + p, 0);
  const lossTotal = Math.abs(lossPnls.reduce((s, p) => s + p, 0));
  const stats = {
    totalTrades: trades.length,
    wins: winPnls.length,
    losses: lossPnls.length,
    strikeRate: trades.length
      ? round2((winPnls.length / trades.length) * 100)
      : 0,
    totalProfitLoss: round2(allPnls.reduce((s, p) => s + p, 0)),
    averageWin: winPnls.length ? round2(winTotal / winPnls.length) : 0,
    averageLoss: lossPnls.length ? round2(lossTotal / lossPnls.length) : 0,
    profitFactor: lossTotal > 0 ? round2(winTotal / lossTotal) : 0,
  };

  const discipline: PulseDisciplineFields = {
    disciplineScore: 100,
    disciplineState: "NORMAL",
    activeConstraints: {
      riskCapPct: null,
      tradeCapCount: null,
      lockoutUntil: null,
      noTradeDays: 0,
      cleanSessionsToLift: 0,
      ntdWarningPending: false,
    },
    lastSessionDate,
    reflectionGatePending: false,
    weeklyBreachCounts: {
      riskPerTrade: 0,
      drawdownDaily: 0,
      drawdownTotal: 0,
      overtrading: 0,
    },
    whyStatement: cfg.whyStatement,
    whyDiscipline: cfg.whyDiscipline,
    accountabilityPartnerEmail: null,
    maxTradesPerDay: cfg.maxTradesPerDay,
    consecutiveCleanDays: 0,
    sessionGateAckDate: null,
    enforcementMode: "SCORE_BASED",
    weeklySeverityTotal: 0,
    ...finalDiscipline,
    ...(finalDiscipline.activeConstraints
      ? { activeConstraints: finalDiscipline.activeConstraints }
      : {}),
  };

  const pulse: Record<string, unknown> = {
    id: pulseHumanId,
    name: cfg.name,
    instruments: cfg.instruments,
    instrumentPointValues: Object.fromEntries(
      cfg.instruments.map((i) => [i, INSTRUMENTS[i]?.pointValue ?? 1]),
    ),
    accountSize: cfg.accountSize,
    maxRiskPerTrade: cfg.maxRiskPerTrade,
    maxDailyDrawdown: cfg.maxDailyDrawdown,
    maxTotalDrawdown: cfg.maxTotalDrawdown,
    maxTradesPerDay: cfg.maxTradesPerDay,
    userId: demoUid,
    createdAt: toTimestamp(createdAt),
    status: "active",
    tradingRules: cfg.rules,
    stats,
    discipline,
    dailyLoss,
    totalDrawdown: round2(totalDrawdown),
  };

  return { docId: cfg.docId, pulse, trades, violationLog, sessions };
}

// ---------------------------------------------------------------------------
// Scenario scripts
// ---------------------------------------------------------------------------

const P1_RULES = [
  { id: "rule-1", description: "Only trade the first two hours of the New York session", isRequired: true },
  { id: "rule-2", description: "Wait for a confirmed break-and-retest before entry", isRequired: true },
  { id: "rule-3", description: "Set the stop loss before entry — never widen it", isRequired: true },
  { id: "rule-4", description: "Screenshot the setup before taking the next trade", isRequired: false },
];

const P2_RULES = [
  { id: "rule-1", description: "Maximum 3 scalps per session, then walk away", isRequired: true },
  { id: "rule-2", description: "No entries in the first 5 minutes after news releases", isRequired: true },
  { id: "rule-3", description: "Hard stop at 4% daily loss — close the platform", isRequired: true },
  { id: "rule-4", description: "Log the trade before taking another", isRequired: false },
];

/** Pulse 1 — "NQ Momentum": clean, profitable, GREEN. */
const P1_DAYS: DayPlan[] = [
  { off: 29, trades: [{ r: 1.4, risk: 300, rr: 2 }], score: 100 },
  { off: 28, trades: [{ r: -1, risk: 310, rr: 2 }], score: 100 },
  { off: 27, trades: [{ r: 1.8, risk: 320, rr: 2.5 }, { r: 1.1, risk: 280, rr: 2 }], score: 100 },
  { off: 25, trades: [{ r: -0.9, risk: 300, rr: 2 }], score: 100 },
  { off: 24, trades: [{ r: 1.5, risk: 350, rr: 2, instrument: "ES" }], score: 100 },
  { off: 23, trades: [{ r: 0, risk: 300, rr: 2 }, { r: 1.2, risk: 310, rr: 2 }], score: 100 },
  { off: 22, trades: [{ r: -1, risk: 320, rr: 2 }], score: 100 },
  { off: 21, trades: [{ r: 2.1, risk: 300, rr: 2.5 }], score: 100 },
  // Dip 1: required rule missed (−4) → 96
  { off: 20, trades: [{ r: -1.05, risk: 340, rr: 2, missed: ["rule-2"] }], score: 96 },
  { off: 19, trades: [{ r: 1.3, risk: 300, rr: 2 }], score: 100 },
  { off: 17, trades: [{ r: 1.2, risk: 310, rr: 2 }, { r: -0.8, risk: 290, rr: 2 }], score: 100 },
  { off: 16, trades: [{ r: 1.6, risk: 330, rr: 2, instrument: "ES" }], score: 100 },
  { off: 14, trades: [{ r: -1, risk: 300, rr: 2 }], score: 100 },
  { off: 13, trades: [{ r: 1.9, risk: 320, rr: 2.5 }], score: 100 },
  // Dip 2: optional rule missed (−1) → 99
  { off: 12, trades: [{ r: 1.1, risk: 300, rr: 2, missed: ["rule-4"] }], score: 99 },
  { off: 11, trades: [{ r: 1.3, risk: 280, rr: 2 }], score: 100 },
  { off: 10, trades: [{ r: -0.95, risk: 310, rr: 2 }], score: 100 },
  { off: 9, trades: [{ r: 1.5, risk: 340, rr: 2 }, { r: 0, risk: 300, rr: 2 }], score: 100 },
  { off: 7, trades: [{ r: 1.4, risk: 320, rr: 2, instrument: "ES" }], score: 100 },
  { off: 6, trades: [{ r: -1, risk: 300, rr: 2 }], score: 100 },
  { off: 5, trades: [{ r: 2.0, risk: 310, rr: 2.5 }, { r: 1.1, risk: 290, rr: 2 }], score: 100 },
  { off: 4, trades: [{ r: -0.85, risk: 330, rr: 2 }], score: 100 },
  { off: 3, trades: [{ r: 1.6, risk: 300, rr: 2 }], score: 100 },
  { off: 2, trades: [{ r: 1.2, risk: 320, rr: 2 }, { r: -0.9, risk: 280, rr: 2 }], score: 100 },
  { off: 0, trades: [{ r: 1.4, risk: 310, rr: 2 }], score: 100 },
];

/** Pulse 2 — "Gold Scalps": walks down to YELLOW + 50% cap + NTD warning. */
const P2_DAYS: DayPlan[] = [
  { off: 19, trades: [{ r: 1.1, risk: 130, rr: 1.5 }, { r: -1, risk: 140, rr: 1.5 }], score: 100 },
  { off: 18, trades: [{ r: 1.3, risk: 130, rr: 1.5 }], score: 100 },
  // Optional rule miss (−1) → 99
  { off: 16, trades: [{ r: -0.9, risk: 150, rr: 1.5, missed: ["rule-4"] }], score: 99 },
  { off: 15, trades: [{ r: 1.4, risk: 140, rr: 2 }], score: 100 },
  // Risk breach #1 (−5) → 95
  {
    off: 13,
    trades: [
      {
        r: -1,
        risk: 230,
        rr: 1.5,
        violations: [
          qv(ViolationType.RISK_PER_TRADE, 5, "Trade risk 2.3% exceeded the 1.5% limit", 1.5, 2.3),
        ],
      },
    ],
    score: 95,
  },
  // Risk breach #2 (−5) → 90
  {
    off: 12,
    trades: [
      {
        r: -1,
        risk: 260,
        rr: 1.5,
        violations: [
          qv(ViolationType.RISK_PER_TRADE, 5, "Trade risk 2.6% exceeded the 1.5% limit", 1.5, 2.6),
        ],
      },
    ],
    score: 90,
  },
  // Clean recovery day (+8) → 98
  { off: 11, trades: [{ r: 1.5, risk: 130, rr: 2 }], score: 98 },
  // Disaster day: daily drawdown breach (−15) + required rule miss (−4) → 79
  {
    off: 9,
    trades: [
      { r: -1, risk: 160, rr: 1.5 },
      { r: -1, risk: 150, rr: 1.5 },
      {
        r: -0.7,
        risk: 160,
        rr: 1.5,
        missed: ["rule-3"],
        violations: [
          qv(ViolationType.DAILY_DRAWDOWN, 15, "Daily loss 4.2% breached the 4% daily drawdown limit", 4, 4.2),
        ],
      },
    ],
    score: 79,
  },
  // Two required rules missed + multi-miss (−4 −4 −5) → 66 (YELLOW)
  {
    off: 7,
    trades: [
      { r: -0.8, risk: 140, rr: 1.5, missed: ["rule-1"] },
      {
        r: 1.0,
        risk: 130,
        rr: 1.5,
        missed: ["rule-2"],
        violations: [
          rv(ViolationType.MULTI_REQUIRED_RULE_MISS, 5, "2 required rules missed in the same session"),
        ],
      },
    ],
    score: 66,
  },
  // Optional miss, amplified in YELLOW (−1) → 65
  { off: 4, trades: [{ r: -1, risk: 140, rr: 1.5, missed: ["rule-4"] }], score: 65 },
  // Risk breach in YELLOW, amplified ×1.25 (−6) → 59; tier 3 → 50% cap + NTD warning
  {
    off: 1,
    trades: [
      {
        r: -1,
        risk: 280,
        rr: 1.5,
        violations: [
          qv(ViolationType.RISK_PER_TRADE, 6, "Trade risk 2.8% exceeded the 1.5% limit (amplified in YELLOW zone)", 1.5, 2.8),
        ],
      },
    ],
    score: 59,
  },
];

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function generateDemoData(
  today: Date,
  demoUid: string,
  toTimestamp: TimestampFactory,
): DemoSeedData {
  const weekdays = lastWeekdays(today, 32);

  const pulse1 = buildPulseSeed({
    cfg: {
      docId: DEMO_PULSE_DOC_IDS[0],
      name: "NQ Momentum",
      accountSize: 25000,
      maxRiskPerTrade: 1.5,
      maxDailyDrawdown: 3,
      maxTotalDrawdown: 20,
      maxTradesPerDay: 3,
      instruments: ["NQ", "ES"],
      rules: P1_RULES,
      whyStatement:
        "Trading is my path to time freedom — building a skill that compounds and lets me work from anywhere on my own terms.",
      whyDiscipline:
        "Following my rules means protecting my family's capital and proving to myself that process beats impulse, every single week.",
      engagement: "rich",
      createdDaysAgo: 48,
    },
    dayPlans: P1_DAYS,
    weekdays,
    demoUid,
    today,
    seed: 1119571,
    finalDiscipline: {
      disciplineScore: 100,
      disciplineState: "NORMAL",
      consecutiveCleanDays: 10,
    },
    toTimestamp,
  });

  const pulse2 = buildPulseSeed({
    cfg: {
      docId: DEMO_PULSE_DOC_IDS[1],
      name: "Gold Scalps",
      accountSize: 10000,
      maxRiskPerTrade: 1.5,
      maxDailyDrawdown: 4,
      maxTotalDrawdown: 25,
      maxTradesPerDay: 4,
      instruments: ["GC"],
      rules: P2_RULES,
      whyStatement:
        "I want to master short-timeframe execution and turn scalping from a gambling habit into a repeatable, boring process.",
      whyDiscipline:
        "My rules are the line between a professional session and a tilted one — following them is how I keep my account alive.",
      engagement: "sparse",
      createdDaysAgo: 30,
    },
    dayPlans: P2_DAYS,
    weekdays,
    demoUid,
    today,
    seed: 2246822,
    finalDiscipline: {
      disciplineScore: 59,
      disciplineState: "LIMITED",
      activeConstraints: {
        riskCapPct: 0.5,
        tradeCapCount: null,
        lockoutUntil: null,
        noTradeDays: 0,
        cleanSessionsToLift: 3,
        ntdWarningPending: true,
      },
      weeklyBreachCounts: {
        riskPerTrade: 1,
        drawdownDaily: 0,
        drawdownTotal: 0,
        overtrading: 0,
      },
      weeklySeverityTotal: 7,
      consecutiveCleanDays: 0,
    },
    toTimestamp,
  });

  // Journal entries — the 12 most recent weekdays
  const journal: DemoDocSeed[] = weekdays.slice(0, 12).map((day, i) => ({
    docId: day,
    data: {
      day,
      text: JOURNAL_TEXTS[i % JOURNAL_TEXTS.length],
      createdAt: toTimestamp(new Date(`${day}T07:30:00.000Z`)),
      updatedAt: toTimestamp(new Date(`${day}T07:30:00.000Z`)),
    },
  }));

  const nowIso = today.toISOString();
  const user: Record<string, unknown> = {
    id: demoUid,
    email: DEMO_EMAIL,
    displayName: DEMO_DISPLAY_NAME,
    role: "user",
    isDemo: true,
    createdAt: daysAgo(today, 60).toISOString(),
    updatedAt: nowIso,
  };

  return { user, pulses: [pulse1, pulse2], journal };
}
