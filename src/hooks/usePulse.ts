"use client";

import { useState } from "react";
import { Pulse, Trade, PulseStatus } from "@/types/pulse";
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
  const getUserPulses = async (
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
  };

  // Get a single pulse by ID
  const getPulseById = async (
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
  };

  // Load more trades for pagination
  const getMoreTrades = async (
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
  };

  // Create a new pulse
  const createPulse = async (
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
  };

  // Create a new trade
  const createTrade = async (
    firestoreId: string,
    tradeData: TradeCreateData,
  ): Promise<Trade | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await pulseApiService.createTrade(
        firestoreId,
        tradeData,
      );

      if (response.success && response.data) {
        onSuccess?.(response.data);
        return response.data;
      } else {
        const errorMessage =
          response.error?.message || "Failed to create trade";
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
  };

  // Update a trade
  const updateTrade = async (
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
  };

  // Update a pulse
  const updatePulse = async (
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
  };

  // Archive a pulse
  const archivePulse = async (
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
  };

  // Unarchive a pulse
  const unarchivePulse = async (
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
  };

  // Delete a pulse
  const deletePulse = async (
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
  };

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
