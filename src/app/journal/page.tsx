"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getDailyQuote } from "@/services/quotes";
import type { Quote } from "@/services/quotes";
import Loader from "@/components/ui/Loader";
import { APP_HOME } from "@/config/routes";

export default function JournalGate() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [entry, setEntry] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);

  useEffect(() => {
    getDailyQuote()
      .then(setQuote)
      .catch(() => setQuote(null));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entry.trim() || !user) return;

    setSubmitting(true);
    setError("");
    try {
      const { getFirebaseToken } = await import(
        "@/services/firebase/authService"
      );
      const token = await getFirebaseToken();
      if (!token) throw new Error("Not authenticated");

      const res = await fetch("/api/journal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: entry }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save your entry");
      }

      // Cookie is set by the response; refresh so middleware re-evaluates
      // the gate and lets us through.
      router.push(APP_HOME);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader />
      </div>
    );
  }

  return (
    <main className="min-h-full">
      <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-widest text-accent">
            Daily check-in
          </p>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-100">
            Before you trade today
          </h1>
          <p className="text-gray-400">
            Take a moment to ground yourself. A short gratitude note keeps
            your mindset deliberate, not reactive.
          </p>
        </div>

        {quote && (
          <blockquote className="border-l-2 border-accent/40 pl-4 text-gray-300 italic">
            &ldquo;{quote.text}&rdquo;
            <span className="block mt-2 text-sm not-italic text-accent">
              — {quote.author}
            </span>
          </blockquote>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label
            htmlFor="journal"
            className="block text-lg font-medium text-gray-200"
          >
            What are you grateful for today?
          </label>
          <textarea
            id="journal"
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            autoFocus
            className="w-full h-40 p-3 bg-gray-800 text-white rounded-md border border-gray-700 focus:ring-2 focus:ring-accent focus:outline-none"
            placeholder="Take a moment to reflect on what you're thankful for..."
          />

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !entry.trim()}
            className="px-5 py-2.5 bg-accent text-white rounded-md hover:bg-accent/80 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Saving..." : "Save & continue"}
          </button>
        </form>
      </div>
    </main>
  );
}
