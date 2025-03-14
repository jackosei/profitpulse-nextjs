import { Timestamp } from "firebase/firestore"

export const MAX_RISK_PERCENTAGE = 3
export const MAX_DAILY_DRAWDOWN = 5 // Default maximum daily loss as percentage of account
export const MAX_TOTAL_DRAWDOWN = 10 // Default maximum total loss as percentage of account

export const PULSE_STATUS = {
	ACTIVE: "active",
	ARCHIVED: "archived",
	LOCKED: "locked",
} as const

export type PulseStatus = (typeof PULSE_STATUS)[keyof typeof PULSE_STATUS]

export interface TradeRule {
	id: string
	description: string
	isRequired: boolean
}

export interface Pulse {
	id: string
	firestoreId?: string
	name: string
	instruments: string[]
	accountSize: number
	maxRiskPerTrade: number
	maxDailyDrawdown: number // User-defined max daily loss percentage
	maxTotalDrawdown: number // User-defined max total drawdown percentage
	userId: string
	createdAt: Timestamp
	status: PulseStatus
	trades?: Trade[]
	stats?: PulseStats
	ruleViolations?: string[]
	tradingRules?: TradeRule[] // Trading rules checklist
	note?: string
	dailyLoss?: { [date: string]: number } // Track daily losses
	totalDrawdown?: number // Track current total drawdown
	hasBeenUpdated?: boolean
	lastUpdate?: {
		date: Timestamp
		reason: string
		previousValues: {
			accountSize: number
			maxRiskPerTrade: number
			maxDailyDrawdown: number
			maxTotalDrawdown: number
		}
	}
}

export interface Trade {
	id: string
	pulseId: string
	userId: string
	date: string
	type: "Buy" | "Sell"
	lotSize: number
	entryPrice: number
	exitPrice: number
	profitLoss: number
	profitLossPercentage: number
	entryReason: string
	outcome: "Win" | "Loss" | "Break-even"
	createdAt: Timestamp
	instrument: string
	learnings?: string
	followedRules?: string[] // IDs of rules that were followed
}

export interface PulseStats {
	totalTrades: number
	wins: number
	losses: number
	strikeRate: number
	totalProfitLoss: number
	averageWin: number
	averageLoss: number
	profitFactor?: number
}
