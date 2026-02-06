"use client";

import type { Trade } from "@/types/pulse";
import TradeFormModal from "./trade-form/TradeFormModal";

interface UpdateTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  trade: Trade;
  pulseId: string;
  firestoreId: string;
  userId: string;
  accountSize: number;
}

export default function UpdateTradeModal({
  isOpen,
  onClose,
  onSuccess,
  trade,
  pulseId,
  firestoreId,
  userId,
  accountSize,
}: UpdateTradeModalProps) {
  return (
    <TradeFormModal
      mode="update"
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
      trade={trade}
      pulseId={pulseId}
      firestoreId={firestoreId}
      userId={userId}
      accountSize={accountSize}
    />
  );
}
