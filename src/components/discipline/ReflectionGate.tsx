"use client";

import { useState } from "react";
import { BookOpen, AlertCircle, Check } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReflectionGateProps {
  /** Pulse ID for API call */
  pulseId: string;
  /** User ID for API call */
  userId: string;
  /** Called when reflection gate is completed */
  onComplete: (newScore: number) => void;
  /** Called when the gate is dismissed (optional — for backdrop clicks) */
  onDismiss?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ReflectionGate — Modal that blocks trading when reflectionGatePending = true.
 *
 * Requires a 50-character minimum reflection response.
 * On submit → POST /api/discipline/reflect → clears gate + awards +5 recovery.
 */
export default function ReflectionGate({
  pulseId,
  userId,
  onComplete,
}: ReflectionGateProps) {
  const [reflection, setReflection] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const charCount = reflection.trim().length;
  const isValid = charCount >= 50;

  const handleSubmit = async () => {
    if (!isValid || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const { getFirebaseToken } = await import("@/services/firebase/authService");
      const token = await getFirebaseToken();
      if (!token) throw new Error("Not authenticated");

      const response = await fetch("/api/discipline/reflect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pulseId, userId, reflection: reflection.trim() }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Server error (${response.status})`);
      }

      const result = await response.json();
      if (result.success) {
        onComplete(result.data.newScore);
      } else {
        throw new Error(result.error || "Failed to submit reflection");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex min-h-[100dvh] w-full items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-red-500/30 bg-[#121212] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-red-500/10 border-b border-red-500/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-200">
                Reflection Required
              </h2>
              <p className="text-xs text-red-400">
                Complete this reflection before continuing to trade
              </p>
            </div>
          </div>
        </div>

        {/* Prompt */}
        <div className="px-6 py-4">
          <label
            htmlFor="reflection-input"
            className="block text-sm text-gray-300 mb-3 leading-relaxed"
          >
            What led to your recent violations and what will you do differently
            going forward?
          </label>

          <textarea
            id="reflection-input"
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="Take a moment to reflect honestly on what happened..."
            rows={5}
            className="w-full rounded-lg bg-gray-800/60 border border-gray-700/60 px-3 py-2.5 
              text-sm text-gray-200 placeholder:text-gray-600
              focus:outline-none focus:ring-1 focus:ring-red-500/40 focus:border-red-500/40
              resize-none"
            disabled={submitting}
          />

          {/* Character count */}
          <div className="flex items-center justify-between mt-2">
            <span
              className={`text-xs tabular-nums ${
                isValid ? "text-emerald-400" : "text-gray-500"
              }`}
            >
              {charCount}/50 characters {isValid && <Check className="inline w-3 h-3 ml-1" />}
              {!isValid && " minimum"}
            </span>

            {isValid && (
              <span className="text-xs text-emerald-400/60">
                +5 recovery pts on submit
              </span>
            )}
          </div>

          {error && (
            <p className="flex items-center gap-1.5 text-xs text-red-400 mt-2">
              <AlertCircle className="w-3.5 h-3.5" />
              {error}
            </p>
          )}
        </div>

        {/* Submit */}
        <div className="px-6 py-4 border-t border-gray-800/60">
          <button
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all
              ${
                isValid
                  ? "bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 active:scale-[0.98]"
                  : "bg-gray-800/40 border border-gray-700/40 text-gray-600 cursor-not-allowed"
              }`}
          >
            {submitting ? "Submitting..." : "Submit Reflection"}
          </button>
        </div>
      </div>
    </div>
  );
}
