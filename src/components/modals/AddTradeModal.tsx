"use client";

import type { AddTradeModalProps } from "@/types/pulse";
import TradeFormModal from "./trade-form/TradeFormModal";

export default function AddTradeModal({
  isOpen,
  onClose,
  onSuccess,
  pulseId,
  firestoreId,
  userId,
  accountSize,
}: AddTradeModalProps) {
  return (
    <TradeFormModal
      mode="create"
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
      pulseId={pulseId}
      firestoreId={firestoreId}
      userId={userId}
      accountSize={accountSize}
    />
  );
}
