import { Pulse, Trade, PulseStatus, TradeRule } from "@/types/pulse";
import {
  ApiResponse,
  createErrorResponse,
  ErrorCode,
  PaginatedResponse,
} from "../types/apiResponses";
import * as pulseService from "../firebase/pulseService";

// Types for createPulse
export interface PulseCreateData {
  name: string;
  instruments: string[];
  accountSize: number;
  maxRiskPerTrade: number;
  maxDailyDrawdown: number;
  maxTotalDrawdown: number;
  userId: string;
  tradingRules?: TradeRule[];
}

// Types for updatePulse
export interface PulseUpdateData {
  accountSize: number;
  maxRiskPerTrade: number;
  maxDailyDrawdown: number;
  maxTotalDrawdown: number;
  instruments: string[];
  tradingRules?: TradeRule[];
  updateReason: string;
}

// Types for createTrade
export interface TradeCreateData {
  pulseId: string;
  userId: string;
  date: string;
  entryTime?: string;
  exitTime?: string;
  type: "Buy" | "Sell";
  lotSize: number;
  entryPrice: number;
  exitPrice: number;
  profitLoss: number;
  profitLossPercentage: number;
  entryReason: string;
  outcome: "Win" | "Loss" | "Break-even";
  instrument: string;
  learnings?: string;
  followedRules?: string[];

  // Screenshots
  entryScreenshot?: string;
  exitScreenshot?: string;

  // Psychological factors
  emotionalState?:
    | "Calm"
    | "Excited"
    | "Fearful"
    | "Greedy"
    | "Anxious"
    | "Confident"
    | "Other";
  emotionalIntensity?: number;
  mentalState?:
    | "Clear"
    | "Distracted"
    | "Tired"
    | "Focused"
    | "Rushed"
    | "Other";

  // Decision quality
  planAdherence?: "Fully" | "Partially" | "Deviated";
  impulsiveEntry?: boolean;

  // Context factors
  marketCondition?:
    | "Trending"
    | "Ranging"
    | "Volatile"
    | "Calm"
    | "News-driven";
  timeOfDay?: string;
  tradingEnvironment?: "Home" | "Office" | "Mobile" | "Other";

  // Post-trade reflection
  wouldRepeat?: boolean;
  emotionalImpact?: "Positive" | "Negative" | "Neutral";
  mistakesIdentified?: string[];
  improvementIdeas?: string;
}

/**
 * Get all pulses for a user
 */
export async function getUserPulses(
  userId: string,
  status?: PulseStatus,
): Promise<ApiResponse<Pulse[]>> {
  try {
    return await pulseService.getUserPulses(userId, status);
  } catch (error) {
    return createErrorResponse(
      ErrorCode.SERVER_ERROR,
      "Failed to fetch pulses",
      { originalError: error instanceof Error ? error.message : String(error) },
    );
  }
}

/**
 * Get a pulse by ID with trades
 */
export async function getPulseById(
  pulseId: string,
  userId: string,
  limit = 20,
): Promise<
  ApiResponse<
    Pulse & {
      firestoreId: string;
      hasMore: boolean;
      lastVisible: string | null;
      trades: Trade[];
    }
  >
> {
  try {
    return await pulseService.getPulseById(pulseId, userId, limit);
  } catch (error) {
    return createErrorResponse(
      ErrorCode.SERVER_ERROR,
      "Failed to fetch pulse",
      { originalError: error instanceof Error ? error.message : String(error) },
    );
  }
}

/**
 * Get more trades for a pulse (for pagination)
 */
export async function getMoreTrades(
  firestoreId: string,
  lastDate: string,
  limit = 20,
): Promise<PaginatedResponse<Trade>> {
  try {
    return await pulseService.getMoreTrades(firestoreId, lastDate, limit);
  } catch (error) {
    return createErrorResponse(
      ErrorCode.SERVER_ERROR,
      "Failed to load more trades",
      { originalError: error instanceof Error ? error.message : String(error) },
    );
  }
}

/**
 * Create a new pulse
 */
export async function createPulse(
  pulseData: PulseCreateData,
): Promise<ApiResponse<Pulse>> {
  try {
    return await pulseService.createPulse(pulseData);
  } catch (error) {
    return createErrorResponse(
      ErrorCode.SERVER_ERROR,
      "Failed to create pulse",
      { originalError: error instanceof Error ? error.message : String(error) },
    );
  }
}

/**
 * Create a new trade for a pulse
 */
export async function createTrade(
  firestoreId: string,
  tradeData: TradeCreateData,
): Promise<ApiResponse<Trade>> {
  try {
    return await pulseService.createTrade(firestoreId, tradeData);
  } catch (error) {
    return createErrorResponse(
      ErrorCode.SERVER_ERROR,
      "Failed to create trade",
      { originalError: error instanceof Error ? error.message : String(error) },
    );
  }
}

/**
 * Update an existing trade
 */
export async function updateTrade(
  firestoreId: string,
  tradeId: string,
  tradeData: TradeCreateData,
): Promise<ApiResponse<void>> {
  try {
    return await pulseService.updateTrade(firestoreId, tradeId, tradeData);
  } catch (error) {
    return createErrorResponse(
      ErrorCode.SERVER_ERROR,
      "Failed to update trade",
      { originalError: error instanceof Error ? error.message : String(error) },
    );
  }
}

/**
 * Update a pulse
 */
export async function updatePulse(
  pulseId: string,
  userId: string,
  updateData: PulseUpdateData,
): Promise<ApiResponse<void>> {
  try {
    return await pulseService.updatePulse(pulseId, userId, updateData);
  } catch (error) {
    return createErrorResponse(
      ErrorCode.SERVER_ERROR,
      "Failed to update pulse",
      { originalError: error instanceof Error ? error.message : String(error) },
    );
  }
}

/**
 * Archive a pulse
 */
export async function archivePulse(
  pulseId: string,
  userId: string,
): Promise<ApiResponse<void>> {
  try {
    return await pulseService.archivePulse(pulseId, userId);
  } catch (error) {
    return createErrorResponse(
      ErrorCode.SERVER_ERROR,
      "Failed to archive pulse",
      { originalError: error instanceof Error ? error.message : String(error) },
    );
  }
}

/**
 * Unarchive a pulse
 */
export async function unarchivePulse(
  pulseId: string,
  userId: string,
): Promise<ApiResponse<void>> {
  try {
    return await pulseService.unarchivePulse(pulseId, userId);
  } catch (error) {
    return createErrorResponse(
      ErrorCode.SERVER_ERROR,
      "Failed to unarchive pulse",
      { originalError: error instanceof Error ? error.message : String(error) },
    );
  }
}

/**
 * Delete a pulse
 */
export async function deletePulse(
  pulseId: string,
  userId: string,
  confirmationName: string,
): Promise<ApiResponse<void>> {
  try {
    return await pulseService.deletePulse(pulseId, userId, confirmationName);
  } catch (error) {
    return createErrorResponse(
      ErrorCode.SERVER_ERROR,
      "Failed to delete pulse",
      { originalError: error instanceof Error ? error.message : String(error) },
    );
  }
}
