"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { APP_HOME } from "@/config/routes";

const features = [
  {
    title: "Track every pulse",
    body: "Group trades into pulses and watch your performance evolve in real time.",
  },
  {
    title: "Discipline engine",
    body: "Rules-based checks flag impulsive trades before they cost you.",
  },
  {
    title: "Daily reflection",
    body: "A short check-in each day keeps your mindset deliberate, not reactive.",
  },
];

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <main className="min-h-full">
      <section className="max-w-5xl mx-auto px-4 md:px-8 py-16 md:py-24 text-center">
        <p className="text-sm uppercase tracking-widest text-accent mb-4">
          ProfitPulse
        </p>
        <h1 className="text-4xl md:text-6xl font-bold text-gray-100 leading-tight">
          Trade tracking,
          <br className="hidden md:block" /> with discipline built in
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-400">
          Monitor your trading performance, enforce your own rules, and
          build a deliberate routine — all in one place.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          {loading ? null : user ? (
            <Link
              href={APP_HOME}
              className="px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent/80 transition-colors"
            >
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/signup"
                className="px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent/80 transition-colors"
              >
                Get started
              </Link>
              <Link
                href="/login"
                className="px-6 py-3 border border-gray-700 text-gray-200 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Sign in
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 md:px-8 pb-20 grid gap-6 md:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6 text-left"
          >
            <h2 className="text-lg font-semibold text-gray-100 mb-2">
              {f.title}
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed">{f.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
