import type { Pulse } from "@/types/pulse";
import type { TimeRange } from "@/components/dashboard/TimeRangeSelector";

interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
}

interface PeriodStats {
  totalProfitLoss: number;
  totalWins: number;
  totalLosses: number;
  totalWinAmount: number;
  totalLossAmount: number;
  avgWin: number;
  avgLoss: number;
}

interface PeriodChange {
  profitLoss: number;
  avgWin: number;
  avgLoss: number;
  profitLossPercentage: number;
  avgWinPercentage: number;
  avgLossPercentage: number;
}

export function getDateRangeFromTimeRange(range: TimeRange): {
  periodStart: Date;
  previousPeriodStart: Date;
} {
  const now = new Date();
  let daysToSubtract = 30; // default to 30 days

  switch (range) {
    case "7D":
      daysToSubtract = 7;
      break;
    case "30D":
      daysToSubtract = 30;
      break;
    case "90D":
      daysToSubtract = 90;
      break;
    case "1Y":
      daysToSubtract = 365;
      break;
    case "ALL":
      daysToSubtract = 36500; // ~100 years, effectively "all time"
      break;
  }

  const periodStart = new Date(
    now.getTime() - daysToSubtract * 24 * 60 * 60 * 1000,
  );
  const previousPeriodStart = new Date(
    periodStart.getTime() - daysToSubtract * 24 * 60 * 60 * 1000,
  );

  return { periodStart, previousPeriodStart };
}

export function calculatePeriodChanges(
  pulses: Pulse[],
  range: TimeRange,
): PeriodChange {
  const { periodStart, previousPeriodStart } = getDateRangeFromTimeRange(range);

  // Initialize stats objects
  const currentStats: PeriodStats = {
    totalProfitLoss: 0,
    totalWins: 0,
    totalLosses: 0,
    totalWinAmount: 0,
    totalLossAmount: 0,
    avgWin: 0,
    avgLoss: 0,
  };

  const previousStats: PeriodStats = {
    totalProfitLoss: 0,
    totalWins: 0,
    totalLosses: 0,
    totalWinAmount: 0,
    totalLossAmount: 0,
    avgWin: 0,
    avgLoss: 0,
  };

  // Calculate stats for each pulse
  pulses.forEach((pulse) => {
    if (!pulse.trades) return;

    pulse.trades.forEach((trade) => {
      // Handle different date formats
      const tradeDate = new Date(
        typeof trade.date === "object" &&
          trade.date !== null &&
          "seconds" in trade.date
          ? (trade.date as FirestoreTimestamp).seconds * 1000
          : trade.date,
      );

      // Current period stats
      if (tradeDate >= periodStart) {
        currentStats.totalProfitLoss += trade.performance.profitLoss;
        if (trade.performance.profitLoss > 0) {
          currentStats.totalWins++;
          currentStats.totalWinAmount += trade.performance.profitLoss;
        } else if (trade.performance.profitLoss < 0) {
          currentStats.totalLosses++;
          currentStats.totalLossAmount += Math.abs(
            trade.performance.profitLoss,
          );
        }
        // Break-even trades (profitLoss === 0) are not counted as wins or losses
      }

      // Previous period stats
      if (tradeDate >= previousPeriodStart && tradeDate < periodStart) {
        previousStats.totalProfitLoss += trade.performance.profitLoss;
        if (trade.performance.profitLoss > 0) {
          previousStats.totalWins++;
          previousStats.totalWinAmount += trade.performance.profitLoss;
        } else if (trade.performance.profitLoss < 0) {
          previousStats.totalLosses++;
          previousStats.totalLossAmount += Math.abs(
            trade.performance.profitLoss,
          );
        }
        // Break-even trades (profitLoss === 0) are not counted as wins or losses
      }
    });
  });

  // Calculate averages
  currentStats.avgWin =
    currentStats.totalWins > 0
      ? currentStats.totalWinAmount / currentStats.totalWins
      : 0;

  currentStats.avgLoss =
    currentStats.totalLosses > 0
      ? currentStats.totalLossAmount / currentStats.totalLosses
      : 0;

  previousStats.avgWin =
    previousStats.totalWins > 0
      ? previousStats.totalWinAmount / previousStats.totalWins
      : 0;

  previousStats.avgLoss =
    previousStats.totalLosses > 0
      ? previousStats.totalLossAmount / previousStats.totalLosses
      : 0;

  // Calculate changes
  const profitLossChange =
    currentStats.totalProfitLoss - previousStats.totalProfitLoss;
  const avgWinChange = currentStats.avgWin - previousStats.avgWin;
  const avgLossChange = currentStats.avgLoss - previousStats.avgLoss;

  // Calculate percentages
  const profitLossPercentage =
    previousStats.totalProfitLoss !== 0
      ? (profitLossChange / Math.abs(previousStats.totalProfitLoss)) * 100
      : 0;

  const avgWinPercentage =
    previousStats.avgWin !== 0
      ? (avgWinChange / Math.abs(previousStats.avgWin)) * 100
      : 0;

  const avgLossPercentage =
    previousStats.avgLoss !== 0
      ? (avgLossChange / Math.abs(previousStats.avgLoss)) * 100
      : 0;

  return {
    profitLoss: profitLossChange,
    avgWin: avgWinChange,
    avgLoss: avgLossChange,
    profitLossPercentage,
    avgWinPercentage,
    avgLossPercentage,
  };
}

export function calculateAggregateStats(pulses: Pulse[]) {
  return pulses.reduce(
    (acc, pulse) => {
      if (pulse.stats) {
        acc.totalTrades += pulse.stats.totalTrades;
        acc.totalWins += pulse.stats.wins;
        acc.totalLosses += pulse.stats.losses;
        acc.totalProfitLoss += pulse.stats.totalProfitLoss;
      }
      return acc;
    },
    {
      totalTrades: 0,
      totalWins: 0,
      totalLosses: 0,
      totalProfitLoss: 0,
    },
  );
}
