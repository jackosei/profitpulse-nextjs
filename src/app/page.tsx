"use client";

import useProtectedRoute from "@/hooks/useProtectedRoute";
import Loader from "@/components/Loader";
import Clock from "@/components/Clock";
import GratitudeJournal from "@/components/GratitudeJournal";
import { getDailyQuote } from "@/firebase/quotes";
import { useEffect, useState } from "react";
import type { Quote } from "@/firebase/quotes";

export default function Home() {
  const { user, loading } = useProtectedRoute();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(true);

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const dailyQuote = await getDailyQuote();
        setQuote(dailyQuote);
      } catch (error) {
        console.error("Error fetching quote:", error);
      } finally {
        setQuoteLoading(false);
      }
    };

    fetchQuote();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader />
      </div>
    );
  }

  return (
    <main className="min-h-screen ">
      <div className="p-2 md:p-6 max-w-5xl mx-auto space-y-6 flex flex-col gap-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="px-4">
            <div className="flex flex-col space-y-2">
              <h1 className="text-2xl font-bold text-accent">
                Welcome {user?.displayName}!
              </h1>
              <p className="text-gray-400">
                Access the dashboard to start managing your trades.
              </p>
            </div>
          </div>
          
          <div className="hidden md:block">
            <Clock />
          </div>
        </div>

        {/* Divider */}
        <hr className="border-gray-700/50" />

        {/* Quote Section */}
        <div className="relative py-12 px-6 overflow-hidden group !mt-0 md:!mt-4">
          {quoteLoading ? (
            <div className="flex justify-center">
              <Loader />
            </div>
          ) : quote ? (
            <div className="relative">
              {/* Opening quote */}
              <div className="absolute -left-2 md:-left-3 -top-16 md:-top-32 text-[6rem] md:text-[12rem] font-serif italic text-accent/5 select-none">"</div>
              {/* Closing quote */}
              <div className="absolute -bottom-16 md:-bottom-32 -right-2 md:-right-3 text-[6rem] md:text-[12rem] font-serif italic text-accent/5 select-none rotate-180 ">"</div>
              
              <div className="relative z-10 max-w-2xl mx-auto">
                <p className="text-xl md:text-2xl font-light tracking-wide font-mono text-gray-100 leading-relaxed">
                  {quote.text}
                </p>
                <div className="mt-6 flex items-center justify-end">
                  <span className="h-[1px] w-12 bg-accent/30 mr-4"></span>
                  <p className="text-sm font-medium text-accent">
                    - {quote.author}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Divider */}
        <hr className="border-gray-700/50" />

        {/* Gratitude Journal */}
        <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl border border-gray-700/50 shadow-lg overflow-hidden">
          <GratitudeJournal />
        </div>
      </div>
    </main>
  );
}
