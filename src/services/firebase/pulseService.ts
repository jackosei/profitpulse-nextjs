import {
  collection,
  addDoc,
  doc,
  getDocs,
  query,
  where,
  updateDoc,
  orderBy,
  limit as firestoreLimit,
  startAfter,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firestoreConfig";
import {
  MAX_RISK_PERCENTAGE,
  MAX_DAILY_DRAWDOWN,
  MAX_TOTAL_DRAWDOWN,
  type Pulse,
  type Trade,
  PULSE_STATUS,
  type PulseStatus,
  type TradeRule
} from "@/types/pulse";
import { ApiResponse, createSuccessResponse, createErrorResponse, ErrorCode, createPaginatedResponse, PaginatedResponse } from "../types/apiResponses";
import { PulseCreateData, PulseUpdateData, TradeCreateData } from "../api/pulseApi";

/**
 * Check if a pulse name already exists for the user
 */
async function checkDuplicatePulseName(name: string, userId: string): Promise<boolean> {
  try {
    const pulsesRef = collection(db, "pulses");
    const q = query(
      pulsesRef,
      where("name", "==", name),
      where("userId", "==", userId)
    );
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error("Error checking duplicate pulse name:", error);
    throw error;
  }
}

/**
 * Create a new pulse
 */
export async function createPulse(
  pulseData: PulseCreateData
): Promise<ApiResponse<Pulse>> {
  try {
    // Validate inputs
    if (pulseData.maxRiskPerTrade > MAX_RISK_PERCENTAGE) {
      return createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        `Maximum risk cannot exceed ${MAX_RISK_PERCENTAGE}%`
      );
    }

    // Check for duplicate name
    const existingPulse = await checkDuplicatePulseName(
      pulseData.name,
      pulseData.userId
    );
    
    if (existingPulse) {
      return createErrorResponse(
        ErrorCode.DUPLICATE_ERROR,
        "A pulse with this name already exists"
      );
    }

    // Generate unique ID
    const date = new Date();
    const dateStr = date
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      })
      .replace(/\//g, "");
    
    const pulseId = `${pulseData.name
      .slice(0, 4)
      .toUpperCase()
      .replace(/\s+/g, "")}${dateStr}`;

    // Create the document with generated ID and timestamp
    const pulseWithId: Pulse = {
      ...pulseData,
      id: pulseId,
      createdAt: Timestamp.now(),
      status: PULSE_STATUS.ACTIVE,
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
    };

    // Add document to Firestore
    const pulsesRef = collection(db, "pulses");
    const docRef = await addDoc(pulsesRef, pulseWithId);
    
    return createSuccessResponse({
      ...pulseWithId,
      firestoreId: docRef.id,
    } as Pulse);
  } catch (error) {
    console.error("Error creating pulse:", error);
    return createErrorResponse(
      ErrorCode.SERVER_ERROR, 
      "Failed to create pulse",
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Get all pulses for a user
 */
export async function getUserPulses(
  userId: string,
  status?: PulseStatus
): Promise<ApiResponse<Pulse[]>> {
  try {
    const pulsesRef = collection(db, "pulses");
    let q = query(pulsesRef, where("userId", "==", userId));

    if (status) {
      q = query(q, where("status", "==", status));
    }

    const querySnapshot = await getDocs(q);
    const pulses = querySnapshot.docs.map((doc) => ({
      firestoreId: doc.id,
      ...doc.data(),
    })) as Pulse[];

    return createSuccessResponse(pulses);
  } catch (error) {
    console.error("Error fetching pulses:", error);
    return createErrorResponse(
      ErrorCode.SERVER_ERROR, 
      "Failed to fetch pulses",
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Get a pulse by ID with trades
 */
export async function getPulseById(
  pulseId: string,
  userId: string,
  limit = 20
): Promise<ApiResponse<Pulse & { 
  firestoreId: string;
  hasMore: boolean;
  lastVisible: string | null;
  trades: Trade[] 
}>> {
  try {
    // Get pulse data
    const pulsesRef = collection(db, "pulses");
    const q = query(
      pulsesRef,
      where("id", "==", pulseId),
      where("userId", "==", userId)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return createErrorResponse(ErrorCode.NOT_FOUND, "Pulse not found");
    }

    const pulseDoc = querySnapshot.docs[0];
    const pulseData = pulseDoc.data() as Pulse;

    // Fetch limited trades with ordering
    const tradesRef = collection(db, "pulses", pulseDoc.id, "trades");
    const tradesQuery = query(tradesRef, orderBy("date", "desc"), firestoreLimit(limit));
    const tradesSnapshot = await getDocs(tradesQuery);

    const trades = tradesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Trade[];

    // Get last document for pagination
    const lastVisible = tradesSnapshot.docs[tradesSnapshot.docs.length - 1];
    const hasMore = tradesSnapshot.docs.length === limit;
    const lastVisibleDate = lastVisible ? (lastVisible.data() as Trade).date : null;

    // Calculate stats
    const stats = await calculatePulseStats(pulseDoc.id);

    return createSuccessResponse({
      ...pulseData,
      firestoreId: pulseDoc.id,
      trades,
      stats: stats.data || pulseData.stats,
      hasMore,
      lastVisible: lastVisibleDate,
    });
  } catch (error) {
    console.error("Error fetching pulse:", error);
    return createErrorResponse(
      ErrorCode.SERVER_ERROR, 
      "Failed to fetch pulse",
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Get more trades for a pulse (for pagination)
 */
export async function getMoreTrades(
  firestoreId: string,
  lastDate: string,
  limit = 20
): Promise<PaginatedResponse<Trade>> {
  try {
    const tradesRef = collection(db, "pulses", firestoreId, "trades");
    const tradesQuery = query(
      tradesRef,
      orderBy("date", "desc"),
      startAfter(lastDate),
      firestoreLimit(limit)
    );
    
    const tradesSnapshot = await getDocs(tradesQuery);
    const trades = tradesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Trade[];

    // Get last document for pagination
    const lastVisible = tradesSnapshot.docs[tradesSnapshot.docs.length - 1];
    const hasMore = tradesSnapshot.docs.length === limit;
    const lastVisibleDate = lastVisible ? (lastVisible.data() as Trade).date : undefined;

    return createPaginatedResponse(
      trades,
      hasMore,
      lastVisibleDate
    );
  } catch (error) {
    console.error("Error fetching more trades:", error);
    return createErrorResponse(
      ErrorCode.SERVER_ERROR, 
      "Failed to fetch more trades",
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Create a new trade
 */
export async function createTrade(
  firestoreId: string,
  tradeData: TradeCreateData
): Promise<ApiResponse<Trade>> {
  try {
    // Add trade to subcollection
    const tradeWithTimestamp = {
      ...tradeData,
      createdAt: Timestamp.now(),
    };

    // Add document to Firestore
    const tradesRef = collection(db, "pulses", firestoreId, "trades");
    const tradeDoc = await addDoc(tradesRef, tradeWithTimestamp);

    // Recalculate stats for the pulse
    await calculatePulseStats(firestoreId);

    return createSuccessResponse({
      id: tradeDoc.id,
      ...tradeWithTimestamp,
    } as Trade);
  } catch (error) {
    console.error("Error creating trade:", error);
    return createErrorResponse(
      ErrorCode.SERVER_ERROR, 
      "Failed to create trade",
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Calculate stats for a pulse
 */
export async function calculatePulseStats(
  firestoreId: string
): Promise<ApiResponse<Pulse["stats"]>> {
  try {
    const tradesRef = collection(db, "pulses", firestoreId, "trades");
    const querySnapshot = await getDocs(tradesRef);
    
    if (querySnapshot.empty) {
      const emptyStats = {
        totalTrades: 0,
        wins: 0,
        losses: 0,
        strikeRate: 0,
        totalProfitLoss: 0,
        averageWin: 0,
        averageLoss: 0,
        profitFactor: 0,
      };
      
      // Update pulse document with empty stats
      const pulseDocRef = doc(db, "pulses", firestoreId);
      await updateDoc(pulseDocRef, { stats: emptyStats });
      
      return createSuccessResponse(emptyStats);
    }

    const trades = querySnapshot.docs.map((doc) => doc.data()) as Trade[];
    
    // Calculate stats
    let wins = 0;
    let losses = 0;
    let totalProfitLoss = 0;
    let totalWinAmount = 0;
    let totalLossAmount = 0;

    trades.forEach((trade) => {
      if (trade.outcome === "Win") {
        wins++;
        totalWinAmount += trade.profitLoss;
      } else if (trade.outcome === "Loss") {
        losses++;
        totalLossAmount += Math.abs(trade.profitLoss);
      }
      
      totalProfitLoss += trade.profitLoss;
    });

    const totalTrades = trades.length;
    const strikeRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const averageWin = wins > 0 ? totalWinAmount / wins : 0;
    const averageLoss = losses > 0 ? totalLossAmount / losses : 0;
    const profitFactor = totalLossAmount > 0 ? totalWinAmount / totalLossAmount : 0;

    const stats = {
      totalTrades,
      wins,
      losses,
      strikeRate,
      totalProfitLoss,
      averageWin,
      averageLoss,
      profitFactor,
    };

    // Update pulse document with new stats
    const pulseDocRef = doc(db, "pulses", firestoreId);
    await updateDoc(pulseDocRef, { stats });

    return createSuccessResponse(stats);
  } catch (error) {
    console.error("Error calculating stats:", error);
    return createErrorResponse(
      ErrorCode.SERVER_ERROR, 
      "Failed to calculate stats",
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Update a pulse
 */
export async function updatePulse(
  pulseId: string,
  userId: string,
  updateData: PulseUpdateData
): Promise<ApiResponse<void>> {
  try {
    // Validate inputs
    if (updateData.maxRiskPerTrade > MAX_RISK_PERCENTAGE) {
      return createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        `Maximum risk cannot exceed ${MAX_RISK_PERCENTAGE}%`
      );
    }

    // Find the pulse
    const pulsesRef = collection(db, "pulses");
    const q = query(
      pulsesRef,
      where("id", "==", pulseId),
      where("userId", "==", userId)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return createErrorResponse(ErrorCode.NOT_FOUND, "Pulse not found");
    }

    const pulseDoc = querySnapshot.docs[0];
    const pulseData = pulseDoc.data() as Pulse;

    // Create update with previous values recorded
    const update = {
      accountSize: updateData.accountSize,
      maxRiskPerTrade: updateData.maxRiskPerTrade,
      maxDailyDrawdown: updateData.maxDailyDrawdown,
      maxTotalDrawdown: updateData.maxTotalDrawdown,
      instruments: updateData.instruments,
      tradingRules: updateData.tradingRules,
      hasBeenUpdated: true,
      lastUpdate: {
        date: Timestamp.now(),
        reason: updateData.updateReason,
        previousValues: {
          accountSize: pulseData.accountSize,
          maxRiskPerTrade: pulseData.maxRiskPerTrade,
          maxDailyDrawdown: pulseData.maxDailyDrawdown,
          maxTotalDrawdown: pulseData.maxTotalDrawdown,
        },
      },
    };

    // Update the document
    await updateDoc(doc(db, "pulses", pulseDoc.id), update);

    return createSuccessResponse(undefined);
  } catch (error) {
    console.error("Error updating pulse:", error);
    return createErrorResponse(
      ErrorCode.SERVER_ERROR, 
      "Failed to update pulse",
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Archive a pulse
 */
export async function archivePulse(
  pulseId: string,
  userId: string
): Promise<ApiResponse<void>> {
  try {
    // Find the pulse
    const pulsesRef = collection(db, "pulses");
    const q = query(
      pulsesRef,
      where("id", "==", pulseId),
      where("userId", "==", userId)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return createErrorResponse(ErrorCode.NOT_FOUND, "Pulse not found");
    }

    const pulseDoc = querySnapshot.docs[0];

    // Update the document status
    await updateDoc(doc(db, "pulses", pulseDoc.id), {
      status: PULSE_STATUS.ARCHIVED,
    });

    return createSuccessResponse(undefined);
  } catch (error) {
    console.error("Error archiving pulse:", error);
    return createErrorResponse(
      ErrorCode.SERVER_ERROR, 
      "Failed to archive pulse",
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Unarchive a pulse
 */
export async function unarchivePulse(
  pulseId: string,
  userId: string
): Promise<ApiResponse<void>> {
  try {
    // Find the pulse
    const pulsesRef = collection(db, "pulses");
    const q = query(
      pulsesRef,
      where("id", "==", pulseId),
      where("userId", "==", userId)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return createErrorResponse(ErrorCode.NOT_FOUND, "Pulse not found");
    }

    const pulseDoc = querySnapshot.docs[0];

    // Update the document status
    await updateDoc(doc(db, "pulses", pulseDoc.id), {
      status: PULSE_STATUS.ACTIVE,
    });

    return createSuccessResponse(undefined);
  } catch (error) {
    console.error("Error unarchiving pulse:", error);
    return createErrorResponse(
      ErrorCode.SERVER_ERROR, 
      "Failed to unarchive pulse",
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Delete a pulse
 */
export async function deletePulse(
  pulseId: string,
  userId: string,
  confirmationName: string
): Promise<ApiResponse<void>> {
  try {
    // Find the pulse
    const pulsesRef = collection(db, "pulses");
    const q = query(
      pulsesRef,
      where("id", "==", pulseId),
      where("userId", "==", userId)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return createErrorResponse(ErrorCode.NOT_FOUND, "Pulse not found");
    }

    const pulseDoc = querySnapshot.docs[0];
    const pulseData = pulseDoc.data() as Pulse;

    // Verify confirmation
    if (confirmationName !== pulseData.name) {
      return createErrorResponse(
        ErrorCode.VALIDATION_ERROR, 
        "Confirmation name does not match"
      );
    }

    // Delete all trades from the subcollection
    const tradesRef = collection(db, "pulses", pulseDoc.id, "trades");
    const tradesSnapshot = await getDocs(tradesRef);
    
    const batch = writeBatch(db);
    tradesSnapshot.docs.forEach((tradeDoc) => {
      batch.delete(doc(db, "pulses", pulseDoc.id, "trades", tradeDoc.id));
    });
    
    // Delete the pulse document
    batch.delete(doc(db, "pulses", pulseDoc.id));
    
    await batch.commit();

    return createSuccessResponse(undefined);
  } catch (error) {
    console.error("Error deleting pulse:", error);
    return createErrorResponse(
      ErrorCode.SERVER_ERROR, 
      "Failed to delete pulse",
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
} 