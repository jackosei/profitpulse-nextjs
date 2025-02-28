import { Timestamp } from 'firebase/firestore';

export const MAX_RISK_PERCENTAGE = 3;
export const PULSE_STATUS = {
  ACTIVE: 'active',
  ARCHIVED: 'archived'
} as const;

export type PulseStatus = typeof PULSE_STATUS[keyof typeof PULSE_STATUS];

export interface Pulse {
  id: string;
  firestoreId?: string;
  name: string;
  instrument: string;
  accountSize: number;
  maxRiskPerTrade: number;
  userId: string;
  createdAt: Timestamp;
  status: PulseStatus;
  trades?: Trade[];
  stats?: PulseStats;
}

export interface Trade {
  id: string;
  pulseId: string;
  userId: string;
  date: string;
  type: 'Buy' | 'Sell';
  lotSize: number;
  entryPrice: number;
  exitPrice: number;
  profitLoss: number;
  profitLossPercentage: number;
  entryReason: string;
  outcome: 'Win' | 'Loss' | 'Break-even';
  createdAt: Timestamp;
  instrument: string;
  learnings?: string;
}

export interface PulseStats {
  totalTrades: number;
  wins: number;
  losses: number;
  strikeRate: number;
  totalProfitLoss: number;
  averageWin: number;
  averageLoss: number;
} 