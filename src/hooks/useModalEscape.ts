"use client";

import { useEffect, useRef } from "react";

/**
 * Calls onClose when Escape is pressed while isActive is true.
 * Keeps the latest onClose in a ref so callers do not need useCallback.
 */
export function useModalEscape(isActive: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onCloseRef.current();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive]);
}
