import { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  AlarmClockOff,
  BellRing,
  BookOpenCheck,
  Calculator,
  ClipboardCheck,
  Gauge,
  LineChart,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import BrowserFrame from "@/components/marketing/BrowserFrame";

export const metadata: Metadata = {
  title: "ProfitPulse — The Trading Journal That Enforces Your Rules",
  description:
    "Every journal shows you what happened. ProfitPulse governs what happens next: a Discipline Engine that scores rule violations and enforces real consequences — risk caps, trade caps, no-trade days.",
  openGraph: {
    title: "ProfitPulse — The Trading Journal That Enforces Your Rules",
    description:
      "A Discipline Engine that scores every rule violation and enforces real consequences. Free during beta — first 100 traders get a lifetime free plan.",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ProfitPulse — The Trading Journal That Enforces Your Rules",
    description:
      "A Discipline Engine that scores every rule violation and enforces real consequences. Free during beta.",
    images: ["/og-image.png"],
  },
};

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

const featureGrid = [
  {
    icon: Gauge,
    title: "Discipline scoring, 0–100",
    body: "Every rule violation carries a severity that hits your score. Green, Yellow, Red — the same breach hits harder the deeper you slip.",
  },
  {
    icon: ShieldAlert,
    title: "Real enforcement",
    body: "Risk caps, trade caps, and no-trade days apply automatically as your score degrades — computed server-side, so it can't be gamed.",
  },
  {
    icon: BellRing,
    title: "WHY reminders & partner alerts",
    body: "Your onboarding WHY resurfaces exactly when you break a rule. Optionally, an accountability partner gets emailed on serious breaches.",
  },
  {
    icon: BookOpenCheck,
    title: "Daily journal gate",
    body: "A short mindset check-in each day before the app opens. Deliberate traders start deliberate sessions.",
  },
  {
    icon: LineChart,
    title: "Review-grade analytics",
    body: "Equity curves, R-multiples, exit quality, psychology and context on every trade — grouped by day for fast weekly reviews.",
  },
  {
    icon: Calculator,
    title: "Futures-aware lot sizing",
    body: "Built-in calculator with tick values for ES, NQ, GC, CL and more — plus Forex, metals, indices and crypto.",
  },
];

const steps = [
  {
    n: "01",
    title: "Create a Pulse with your rules",
    body: "Set risk limits, drawdown caps, and your trading rule checklist. Commit to your WHY — it comes back when you need it most.",
  },
  {
    n: "02",
    title: "Log every trade honestly",
    body: "The engine computes intended risk, R-multiples and exit quality, and auto-detects violations — oversized risk, overtrading, drawdown breaches, missed rules.",
  },
  {
    n: "03",
    title: "The engine pushes back",
    body: "Violations drop your score. Degraded zones trigger caps and no-trade days. Clean sessions earn it all back. Discipline becomes a habit with a feedback loop.",
  },
];

const disciplineSteps = [
  {
    icon: Activity,
    title: "Every violation is scored",
    body: "Oversized risk −5. Daily drawdown breach −15. Missed required rule −4. Severity is amplified when your zone is already degraded.",
  },
  {
    icon: ShieldCheck,
    title: "Your zone sets the stakes",
    body: "75+ keeps you Stable. Slip below and you're At Risk; below 40 is Enforcement. The zone drives a five-tier ladder of consequences.",
  },
  {
    icon: AlarmClockOff,
    title: "Consequences are real",
    body: "75% risk cap → 50% cap with a no-trade-day warning → an actual no-trade day. Recovery takes clean sessions, not promises.",
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LandingPage() {
  return (
    <div className="overflow-x-clip">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(ellipse_at_top,rgba(0,198,136,0.13),transparent_60%)]"
        />
        <div className="relative mx-auto max-w-6xl text-center">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5 text-xs font-medium text-accent-light hover:bg-accent/20 transition-colors"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent-light" />
            Now in beta — first 100 traders get a lifetime free plan
          </Link>

          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-white sm:text-6xl">
            The trading journal that{" "}
            <span className="bg-gradient-to-r from-accent-light to-emerald-300 bg-clip-text text-transparent">
              enforces your rules
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400">
            Every journal shows you what happened. ProfitPulse governs what
            happens <em className="not-italic text-gray-200">next</em> — a
            Discipline Engine that scores every rule violation and applies real
            consequences: risk caps, trade caps, no-trade days.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="w-full rounded-lg bg-accent px-7 py-3.5 text-base font-semibold text-white hover:bg-accent-hover transition-colors sm:w-auto"
            >
              Start free
            </Link>
            <Link
              href="/login?demo=1"
              className="w-full rounded-lg border border-white/15 bg-white/5 px-7 py-3.5 text-base font-semibold text-gray-200 hover:bg-white/10 transition-colors sm:w-auto"
            >
              Try the live demo →
            </Link>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            No credit card. The demo is a real, pre-loaded account — no signup
            needed.
          </p>

          <div className="mx-auto mt-14 max-w-5xl">
            <BrowserFrame
              src="/assets/images/landing/performance.png"
              alt="ProfitPulse pulse detail — equity curve, win rate, profit factor"
              priority
              glow
            />
          </div>

          {/* Honest concept chips — no fabricated social proof */}
          <div className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-gray-500">
            <span>Discipline score 0–100</span>
            <span className="hidden h-1 w-1 rounded-full bg-gray-700 sm:block" />
            <span>5-tier enforcement ladder</span>
            <span className="hidden h-1 w-1 rounded-full bg-gray-700 sm:block" />
            <span>8 violation types auto-detected</span>
            <span className="hidden h-1 w-1 rounded-full bg-gray-700 sm:block" />
            <span>Futures · Forex · Crypto</span>
          </div>
        </div>
      </section>

      {/* ── Discipline Engine story ──────────────────────────────────────── */}
      <section id="discipline" className="border-t border-white/5 bg-dark px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-accent-light">
              The Discipline Engine
            </p>
            <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
              Other journals tell you that you broke your rules.
              <br className="hidden sm:block" /> ProfitPulse makes it cost you.
            </h2>
            <p className="mt-4 text-gray-400">
              A closed behavioural loop, computed entirely server-side: detect
              the violation, score it, and constrain what you can do next.
              Recovery is earned with clean sessions — not by closing a popup.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {disciplineSteps.map((s) => (
              <div
                key={s.title}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-6"
              >
                <s.icon className="h-6 w-6 text-accent-light" aria-hidden />
                <h3 className="mt-4 text-lg font-semibold text-white">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                  {s.body}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-14">
            <BrowserFrame
              src="/assets/images/landing/discipline.png"
              alt="Discipline tab — score 59 At Risk, active 50% risk cap and no-trade-day warning"
            />
            <p className="mt-4 text-center text-sm text-gray-500">
              A real degraded pulse: score 59, zone At Risk, 50% risk cap
              active, no-trade day armed on the next breach — and the trader&apos;s
              own WHY front and center.
            </p>
          </div>
        </div>
      </section>

      {/* ── Feature rows ─────────────────────────────────────────────────── */}
      <section className="px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto flex max-w-6xl flex-col gap-24">
          {/* Row 1 — session gate */}
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-accent-light">
                Friction when it matters
              </p>
              <h3 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
                Constraints you must look in the eye
              </h3>
              <p className="mt-4 leading-relaxed text-gray-400">
                When caps are active, your session starts with an
                acknowledgement gate — your constraints and your WHY, before a
                single trade is logged. Capped trades require an explicit
                acknowledged submit. No-trade days require typing it out.
                Nothing is silently blocked; everything is deliberately
                uncomfortable.
              </p>
            </div>
            <BrowserFrame
              src="/assets/images/landing/session-gate.png"
              alt="Session gate — active constraints acknowledgement before trading"
            />
          </div>

          {/* Row 2 — trade log */}
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="lg:order-2">
              <p className="text-sm font-semibold uppercase tracking-widest text-accent-light">
                Review-grade journaling
              </p>
              <h3 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
                Your week, one glance
              </h3>
              <p className="mt-4 leading-relaxed text-gray-400">
                Trades grouped by day with win rate and P/L per session. Every
                entry captures execution, psychology, market context and
                reflection — so Sunday reviews take minutes, not hours. Entry
                reasons and lessons learned sit next to the numbers they
                explain.
              </p>
            </div>
            <div className="lg:order-1">
              <BrowserFrame
                src="/assets/images/landing/trade-log.png"
                alt="Trade log — trades grouped by day with per-session win rate and P/L"
              />
            </div>
          </div>

          {/* Row 3 — dashboard */}
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-accent-light">
                Every strategy, one pulse
              </p>
              <h3 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
                Separate accounts, separate rules
              </h3>
              <p className="mt-4 leading-relaxed text-gray-400">
                Group trades into Pulses — one per strategy or account — each
                with its own risk parameters, rule checklist and discipline
                state. The dashboard rolls it all up: P/L, profit factor,
                strike rate, average win and loss.
              </p>
            </div>
            <BrowserFrame
              src="/assets/images/landing/dashboard.png"
              alt="Dashboard — aggregate stats and trading pulses"
            />
          </div>
        </div>
      </section>

      {/* ── Feature grid ─────────────────────────────────────────────────── */}
      <section id="features" className="border-t border-white/5 bg-dark px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Built for traders who mean it
            </h2>
            <p className="mt-4 text-gray-400">
              Everything a serious day trader needs to journal, review, and —
              uniquely — stay accountable.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featureGrid.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-6 hover:border-accent/30 transition-colors"
              >
                <f.icon className="h-6 w-6 text-accent-light" aria-hidden />
                <h3 className="mt-4 font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              How it works
            </h2>
          </div>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="relative">
                <span className="text-5xl font-bold text-white/10">{s.n}</span>
                <h3 className="mt-2 text-lg font-semibold text-white">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing / beta band ──────────────────────────────────────────── */}
      <section id="pricing" className="border-t border-white/5 bg-dark px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-3xl rounded-2xl border border-accent/25 bg-gradient-to-b from-accent/10 to-transparent p-8 text-center sm:p-12">
          <ClipboardCheck className="mx-auto h-8 w-8 text-accent-light" aria-hidden />
          <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
            Free during beta
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-gray-300">
            ProfitPulse is free while we&apos;re in beta — and the{" "}
            <span className="font-semibold text-accent-light">
              first 100 beta users are grandfathered into a free lifetime plan
            </span>
            . Help shape the product; keep it forever.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="w-full rounded-lg bg-accent px-7 py-3.5 text-base font-semibold text-white hover:bg-accent-hover transition-colors sm:w-auto"
            >
              Claim your lifetime spot
            </Link>
            <Link
              href="/login?demo=1"
              className="w-full rounded-lg border border-white/15 px-7 py-3.5 text-base font-semibold text-gray-200 hover:bg-white/5 transition-colors sm:w-auto"
            >
              Kick the tires first
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
