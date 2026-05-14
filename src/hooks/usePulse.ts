"use client";

import { useState, useCallback } from "react";
import { Pulse, Trade, PulseStatus, TradeEvaluationResult } from "@/types/pulse";
import * as pulseApiService from "@/services/api/pulseApi";
import type {
  PulseCreateData,
  PulseUpdateData,
  TradeCreateData,
} from "@/services/api/pulseApi";

interface UsePulseProps {
  onSuccess?: <T>(data: T) => void;
  onError?: (message: string) => void;
}

export function usePulse(props?: UsePulseProps) {
  const { onSuccess, onError } = props || {};
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get user's pulses
  const getUserPulses = useCallback(async (
    userId: string,
    status?: string,
  ): Promise<Pulse[] | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await pulseApiService.getUserPulses(
        userId,
        status as PulseStatus,
      );

      if (response.success && response.data) {
        onSuccess?.(response.data);
        return response.data;
      } else {
        const errorMessage =
          response.error?.message || "Failed to fetch pulses";
        setError(errorMessage);
        onError?.(errorMessage);
        return null;
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMessage);
      onError?.(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [onSuccess, onError]);

  // Get a single pulse by ID
  const getPulseById = useCallback(async (
    pulseId: string,
    userId: string,
    limit?: number,
  ): Promise<
    | (Pulse & {
        firestoreId: string;
        hasMore: boolean;
        lastVisible: string | null;
        trades: Trade[];
      })
    | null
  > => {
    setLoading(true);
    setError(null);

    try {
      const response = await pulseApiService.getPulseById(
        pulseId,
        userId,
        limit,
      );

      if (response.success && response.data) {
        onSuccess?.(response.data);
        return response.data;
      } else {
        const errorMessage = response.error?.message || "Failed to fetch pulse";
        setError(errorMessage);
        onError?.(errorMessage);
        return null;
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMessage);
      onError?.(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [onSuccess, onError]);

  // Load more trades for pagination
  const getMoreTrades = useCallback(async (
    firestoreId: string,
    lastDate: string,
    limit?: number,
  ): Promise<{
    trades: Trade[];
    hasMore: boolean;
    lastVisible: string | null;
  } | null> => {
    setLoading(true);

    try {
      const response = await pulseApiService.getMoreTrades(
        firestoreId,
        lastDate,
        limit,
      );

      if (response.success && response.data) {
        const result = {
          trades: response.data,
          hasMore: !!response.pagination?.hasMore,
          lastVisible: response.pagination?.lastCursor || null,
        };
        return result;
      } else {
        const errorMessage =
          response.error?.message || "Failed to load more trades";
        setError(errorMessage);
        onError?.(errorMessage);
        return null;
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMessage);
      onError?.(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [onError]);

  // Create a new pulse
  const createPulse = useCallback(async (
    pulseData: PulseCreateData,
  ): Promise<Pulse | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await pulseApiService.createPulse(pulseData);

      if (response.success && response.data) {
        onSuccess?.(response.data);
        return response.data;
      } else {
        const errorMessage =
          response.error?.message || "Failed to create pulse";
        setError(errorMessage);
        onError?.(errorMessage);
        return null;
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMessage);
      onError?.(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [onSuccess, onError]);

  // Create a new trade — calls server-side /api/discipline/evaluate
  // All violation detection, score mutation, and persistence happen server-side.
  const createTrade = useCallback(async (
    firestoreId: string,
    tradeData: TradeCreateData,
  ): Promise<TradeEvaluationResult | null> => {
    setLoading(true);
    setError(null);

    try {
      // Get Firebase auth token for server-side verification
      const { getFirebaseToken } = await import("@/services/auth");
      const token = await getFirebaseToken();
      if (!token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch("/api/discipline/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pulseId: tradeData.pulseId,
          userId: tradeData.userId,
          tradeData,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || `Server error (${response.status})`);
      }

      const result = await response.json();

      if (result.success && result.data?.trade) {
        onSuccess?.(result.data.trade);
        return result.data; // Return the full payload
      } else {
        const errorMessage = result.error || "Failed to create trade";
        setError(errorMessage);
        onError?.(errorMessage);
        return null;
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMessage);
      onError?.(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [onSuccess, onError]);

  // Update a trade
  const updateTrade = useCallback(async (
    firestoreId: string,
    tradeId: string,
    tradeData: TradeCreateData,
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await pulseApiService.updateTrade(
        firestoreId,
        tradeId,
        tradeData,
      );
      return response.success;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update trade";
      setError(errorMessage);
      onError?.(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [onError]);

  // Update a pulse
  const updatePulse = useCallback(async (
    pulseId: string,
    userId: string,
    updateData: PulseUpdateData,
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await pulseApiService.updatePulse(
        pulseId,
        userId,
        updateData,
      );
      return response.success;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update pulse";
      setError(errorMessage);
      onError?.(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [onError]);

  // Archive a pulse
  const archivePulse = useCallback(async (
    pulseId: string,
    userId: string,
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await pulseApiService.archivePulse(pulseId, userId);
      return response.success;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to archive pulse";
      setError(errorMessage);
      onError?.(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [onError]);

  // Unarchive a pulse
  const unarchivePulse = useCallback(async (
    pulseId: string,
    userId: string,
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await pulseApiService.unarchivePulse(pulseId, userId);
      return response.success;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to unarchive pulse";
      setError(errorMessage);
      onError?.(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [onError]);

  // Delete a pulse
  const deletePulse = useCallback(async (
    pulseId: string,
    userId: string,
    confirmationName: string,
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await pulseApiService.deletePulse(
        pulseId,
        userId,
        confirmationName,
      );
      return response.success;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete pulse";
      setError(errorMessage);
      onError?.(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [onError]);

  return {
    getUserPulses,
    getPulseById,
    getMoreTrades,
    createPulse,
    createTrade,
    updateTrade,
    updatePulse,
    archivePulse,
    unarchivePulse,
    deletePulse,
    loading,
    error,
  };
}
