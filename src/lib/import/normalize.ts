/**
 * Normalization of externally executed trades (MT5 EA payloads today,
 * CSV/statement rows later) into the app's TradeCreateData shape.
 *
 * Pure module — no Firestore, no Next.js. Unit-scriptable via tsx.
 */

import type { TradeCreateData } from "@/services/api/pulseApi";

/** One closed position as reported by the ProfitPulse sync EA. */
export interface EaTrade {
  /** MT5 position id (ticket) — the dedup key. */
  positionId: number | string;
  /** Raw broker symbol, e.g. "XAUUSD.pro". */
  symbol: string;
  type: "buy" | "sell";
  lots: number;
  /** Broker-server epoch seconds. */
  openTime: number;
  closeTime: number;
  openPrice: number;
  closePrice: number;
  /** 0 = none (MT5 convention). */
  sl?: number;
  tp?: number;
  commission?: number;
  swap?: number;
  /** Gross P&L as the broker reports it, before commission/swap. */
  profit: number;
}

export interface NormalizeContext {
  pulseId: string;
  userId: string;
  accountSize: number;
  /** The pulse's configured instrument list to map broker symbols onto. */
  instruments: string[];
  /** Hours to subtract from broker-server time to reach UTC (EA input). */
  gmtOffsetHours?: number;
  syncBatchId: string;
}

export interface NormalizedTrade {
  tradeData: TradeCreateData;
  /** False when the broker symbol didn't match a pulse instrument and the
   *  suffix-stripped symbol was used as-is. */
  symbolMatched: boolean;
}

/** Suffix-stripped candidates for a broker symbol, most specific first:
 *  "XAUUSD.pro" → ["XAUUSD.PRO", "XAUUSD"], "EURUSDm" → ["EURUSDM", "EURUSD"]. */
function symbolCandidates(brokerSymbol: string): string[] {
  const upper = brokerSymbol.toUpperCase().trim();
  const candidates = [upper];
  const dotStripped = upper.split(".")[0].split("#")[0].split("-")[0].split("_")[0];
  if (dotStripped && dotStripped !== upper) candidates.push(dotStripped);
  // Micro/mini/cent suffix letters after a recognizable 6-char forex pair
  const base = candidates[candidates.length - 1];
  if (base.length > 6 && /^[A-Z]{6}[A-Z]{1,3}$/.test(base)) {
    candidates.push(base.slice(0, 6));
  }
  return candidates;
}

/** Map a raw broker symbol to a configured pulse instrument. */
export function mapSymbol(
  brokerSymbol: string,
  instruments: string[],
): { instrument: string; matched: boolean } {
  const byUpper = new Map(instruments.map((i) => [i.toUpperCase(), i]));
  for (const candidate of symbolCandidates(brokerSymbol)) {
    const hit = byUpper.get(candidate);
    if (hit) return { instrument: hit, matched: true };
  }
  // No configured match — use the most-stripped candidate so at least the
  // default point-value lookup has a clean symbol to work with.
  const candidates = symbolCandidates(brokerSymbol);
  return { instrument: candidates[candidates.length - 1], matched: false };
}

function toUtcDate(brokerEpochSeconds: number, gmtOffsetHours: number): Date {
  return new Date((brokerEpochSeconds - gmtOffsetHours * 3600) * 1000);
}

function dateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

function timeString(d: Date): string {
  return d.toISOString().slice(11, 16); // HH:MM
}

/** Round to cents — broker sums can carry float noise. */
function money(n: number): number {
  return Math.round(n * 100) / 100;
}

export function normalizeEaTrade(
  ea: EaTrade,
  ctx: NormalizeContext,
): NormalizedTrade {
  const offset = ctx.gmtOffsetHours ?? 0;
  const openAt = toUtcDate(ea.openTime, offset);
  const closeAt = toUtcDate(ea.closeTime, offset);

  const { instrument, matched } = mapSymbol(ea.symbol, ctx.instruments);

  const gross = ea.profit;
  const commission = ea.commission ?? 0;
  const swap = ea.swap ?? 0;
  const net = money(gross + commission + swap);

  const outcome: TradeCreateData["outcome"] =
    net > 0 ? "Win" : net < 0 ? "Loss" : "Break-even";

  // A position that closed on a later session than it opened would trip the
  // entryTime < exitTime validation (times are per-day) — omit entryTime for
  // multi-day holds.
  const sameDay = dateString(openAt) === dateString(closeAt);

  const tradeData: TradeCreateData = {
    pulseId: ctx.pulseId,
    userId: ctx.userId,
    // The session a trade belongs to is the day it CLOSED.
    date: dateString(closeAt),
    type: ea.type === "buy" ? "Buy" : "Sell",
    instrument,
    outcome,
    execution: {
      ...(sameDay ? { entryTime: timeString(openAt) } : {}),
      exitTime: timeString(closeAt),
      lotSize: ea.lots,
      entryPrice: ea.openPrice,
      exitPrice: ea.closePrice,
      ...(ea.sl ? { plannedSL: ea.sl } : {}),
      ...(ea.tp ? { plannedTP: ea.tp } : {}),
      entryReason: "Synced from MT5",
    },
    performance: {
      profitLoss: net,
      profitLossPercentage:
        ctx.accountSize > 0 ? (net / ctx.accountSize) * 100 : 0,
      grossProfitLoss: money(gross),
      ...(commission !== 0 ? { commission: money(commission) } : {}),
      ...(swap !== 0 ? { swap: money(swap) } : {}),
    },
    source: "ea:mt5",
    externalId: String(ea.positionId),
    syncBatchId: ctx.syncBatchId,
    brokerSymbol: ea.symbol,
  };

  return { tradeData, symbolMatched: matched };
}

export function normalizeEaTrades(
  trades: EaTrade[],
  ctx: NormalizeContext,
): NormalizedTrade[] {
  return trades.map((t) => normalizeEaTrade(t, ctx));
}
