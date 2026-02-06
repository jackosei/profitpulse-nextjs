import { Timestamp } from "firebase/firestore";

export const MAX_RISK_PERCENTAGE = 3;
export const MAX_DAILY_DRAWDOWN = 5; // Default maximum daily loss as percentage of account
export const MAX_TOTAL_DRAWDOWN = 10; // Default maximum total loss as percentage of account

export const PULSE_STATUS = {
  ACTIVE: "active",
  ARCHIVED: "archived",
  LOCKED: "locked",
} as const;

export type PulseStatus = (typeof PULSE_STATUS)[keyof typeof PULSE_STATUS];

export interface TradeRule {
  id: string;
  description: string;
  isRequired: boolean;
}

export interface Pulse {
  id: string;
  firestoreId?: string;
  name: string;
  instruments: string[];
  accountSize: number;
  maxRiskPerTrade: number;
  maxDailyDrawdown: number; // User-defined max daily loss percentage
  maxTotalDrawdown: number; // User-defined max total drawdown percentage
  userId: string;
  createdAt: Timestamp;
  status: PulseStatus;
  trades?: Trade[];
  stats?: PulseStats;
  ruleViolations?: string[];
  tradingRules?: TradeRule[]; // Trading rules checklist
  note?: string;
  dailyLoss?: { [date: string]: number }; // Track daily losses
  totalDrawdown?: number; // Track current total drawdown
  hasBeenUpdated?: boolean;
  lastUpdate?: {
    date: Timestamp;
    reason: string;
    previousValues: {
      accountSize: number;
      maxRiskPerTrade: number;
      maxDailyDrawdown: number;
      maxTotalDrawdown: number;
    };
  };
}

// Nested data structures for better organization
export interface TradeExecution {
  entryTime?: string;
  exitTime?: string;
  lotSize: number;
  entryPrice: number;
  exitPrice: number;
  entryReason: string;
  entryScreenshot?: string;
  exitScreenshot?: string;
}

export interface TradePerformance {
  profitLoss: number;
  profitLossPercentage: number;
}

export interface TradePsychology {
  emotionalState?:
    | "Calm"
    | "Excited"
    | "Fearful"
    | "Greedy"
    | "Anxious"
    | "Confident"
    | "Other";
  emotionalIntensity?: number; // 1-10 scale
  mentalState?:
    | "Clear"
    | "Distracted"
    | "Tired"
    | "Focused"
    | "Rushed"
    | "Other";
  planAdherence?: "Fully" | "Partially" | "Deviated";
  impulsiveEntry?: boolean;
}

export interface TradeContext {
  marketCondition?:
    | "Trending"
    | "Ranging"
    | "Volatile"
    | "Calm"
    | "News-driven";
  timeOfDay?: string;
  tradingEnvironment?: "Home" | "Office" | "Mobile" | "Other";
}

export interface TradeReflection {
  wouldRepeat?: boolean;
  emotionalImpact?: "Positive" | "Negative" | "Neutral";
  mistakesIdentified?: string[];
  improvementIdeas?: string;
}

// Clean nested Trade interface (no backward compatibility)
export interface Trade {
  // Meta
  id: string;
  pulseId: string;
  userId: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;

  // Core trade info
  date: string;
  type: "Buy" | "Sell";
  instrument: string;
  outcome: "Win" | "Loss" | "Break-even";

  // Nested data
  execution: TradeExecution;
  performance: TradePerformance;
  psychology?: TradePsychology;
  context?: TradeContext;
  reflection?: TradeReflection;

  // Other
  learnings?: string;
  followedRules?: string[];
}

export interface PulseStats {
  totalTrades: number;
  wins: number;
  losses: number;
  strikeRate: number;
  totalProfitLoss: number;
  averageWin: number;
  averageLoss: number;
  profitFactor?: number;
}

export interface TradeDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  trade: Trade;
  pulse?: Pulse; // Add this to access pulse data for rule lookup
}

export interface PulseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pulse: Pulse;
}

export interface AddTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  pulseId: string;
  firestoreId: string;
  userId: string;
  maxRiskPercentage: number;
  accountSize: number;
}

export interface DeletePulseModalProps {
  isOpen: boolean;
  onClose: () => void;
  pulse: {
    id: string;
    name: string;
  };
  onSuccess: () => void;
}
