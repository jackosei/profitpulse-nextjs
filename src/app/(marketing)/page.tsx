import { Metadata } from "next";
import Link from "next/link";
import BrowserFrame from "@/components/marketing/BrowserFrame";

export const metadata: Metadata = {
  title: "ProfitPulse: The Trading Journal That Enforces Your Rules",
  description:
    "Every journal shows you what happened. ProfitPulse governs what happens next: a Discipline Engine that scores rule violations and enforces real consequences. Risk caps, trade caps, no-trade days.",
  openGraph: {
    title: "ProfitPulse: The Trading Journal That Enforces Your Rules",
    description:
      "A Discipline Engine that scores every rule violation and enforces real consequences. Free during beta. The first 100 traders keep a lifetime free plan.",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ProfitPulse: The Trading Journal That Enforces Your Rules",
    description:
      "A Discipline Engine that scores every rule violation and enforces real consequences. Free during beta.",
    images: ["/og-image.png"],
  },
};

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

const penalties = [
  { violation: "Risk per trade exceeded", points: "−5" },
  { violation: "Daily drawdown breached", points: "−15" },
  { violation: "Total drawdown breached", points: "−25, permanent lock" },
  { violation: "Max trades per day exceeded", points: "−8" },
  { violation: "Required rule missed", points: "−4 per rule" },
  { violation: "Optional rule missed", points: "−1 per rule" },
  { violation: "No-trade day violated", points: "−20" },
];

const recoveries = [
  { action: "Clean session, every rule followed", points: "+8" },
  { action: "Thorough journaling, even on a bad day", points: "up to +4" },
  { action: "Three consecutive clean days", points: "+10" },
];

const tiers = [
  { band: "85 to 100", consequence: "No constraints. Trade your plan." },
  { band: "70 to 84", consequence: "Risk capped at 75% of your limit." },
  { band: "55 to 69", consequence: "Risk capped at 50%. No-trade day armed." },
  { band: "40 to 54", consequence: "No-trade day, and the 50% cap holds." },
  { band: "Below 40", consequence: "Extended no-trade days until you recover." },
];

const capabilities = [
  {
    term: "Discipline scoring",
    detail:
      "A 0 to 100 score per strategy. Violations are detected automatically at submission and scored by severity, amplified when your zone is already degraded.",
  },
  {
    term: "Two enforcement modes",
    detail:
      "Score-based, where recovery is earned through clean sessions. Or severity-based, where Monday brings a fresh slate. You choose per strategy, at creation.",
  },
  {
    term: "WHY reminders and partner alerts",
    detail:
      "The commitment you wrote at onboarding resurfaces the moment you break a rule. Serious breaches can email an accountability partner you nominate.",
  },
  {
    term: "Daily journal gate",
    detail:
      "A short written check-in before the app opens each day. Deliberate sessions start deliberately.",
  },
  {
    term: "Review-grade analytics",
    detail:
      "Equity curves, R-multiples, exit quality, psychology and market context on every trade, grouped by day for fast weekly reviews.",
  },
  {
    term: "Futures-aware sizing",
    detail:
      "A lot-size calculator with tick values for ES, NQ, GC, CL and more, alongside Forex, metals, indices and crypto.",
  },
];

const loop = [
  {
    lead: "Configure.",
    body: "Create a Pulse for each strategy: risk limits, drawdown caps, your rule checklist, and the WHY you are trading for in the first place.",
  },
  {
    lead: "Log.",
    body: "Record every trade honestly. The engine computes intended risk, R-multiples and exit quality, and detects violations on its own. It does not ask.",
  },
  {
    lead: "Answer for it.",
    body: "Violations cost points. Degraded scores trigger caps and no-trade days. Clean sessions earn it back. The loop closes whether you like it or not.",
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LandingPage() {
  return (
    <div>
      {/* Beta strip */}
      <div className="border-b border-[var(--mk-line)]">
        <div className="mx-auto flex max-w-[80rem] flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-4 py-2.5 text-[0.875rem] sm:px-6">
          <p>
            Free during beta. The first 100 traders keep a{" "}
            <span className="font-semibold">lifetime free plan</span>.
          </p>
          <Link
            href="/signup"
            className="underline underline-offset-4 decoration-[var(--mk-green)] decoration-2 hover:decoration-[var(--mk-ink)]"
          >
            Claim a spot
          </Link>
        </div>
      </div>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[80rem] px-4 sm:px-6">
        <div className="pb-14 pt-16 sm:pt-24 lg:pb-20">
          <h1 className="max-w-[60rem] text-[clamp(2.75rem,8.5vw,7.5rem)] font-semibold leading-[0.95] tracking-[-0.03em]">
            The trading journal that{" "}
            <span className="underline decoration-[var(--mk-green)] decoration-[0.06em] underline-offset-[0.08em]">
              enforces
            </span>{" "}
            your rules.
          </h1>

          <div className="mt-12 grid grid-cols-12 gap-x-6 gap-y-8 border-t border-[var(--mk-line)] pt-8 lg:mt-16">
            <p className="col-span-12 max-w-xl text-lg leading-relaxed text-[var(--mk-muted)] md:col-span-7 lg:col-span-6">
              Every journal shows you what happened. ProfitPulse governs what
              happens next. A Discipline Engine scores each rule violation and
              applies real consequences: risk caps, trade caps, no-trade days.
            </p>
            <div className="col-span-12 md:col-span-5 md:justify-self-end lg:col-span-6 lg:max-w-md lg:justify-self-end">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className="border border-[var(--mk-ink)] bg-[var(--mk-ink)] px-6 py-3.5 text-center font-medium text-[var(--mk-bg)] hover:bg-[var(--mk-green-strong)] hover:border-[var(--mk-green-strong)] hover:text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--mk-ink)]"
                >
                  Start free
                </Link>
                <Link
                  href="/login?demo=1"
                  className="border border-[var(--mk-ink)] px-6 py-3.5 text-center font-medium hover:bg-[var(--mk-ink)] hover:text-[var(--mk-bg)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--mk-ink)]"
                >
                  Try the live demo
                </Link>
              </div>
              <p className="mt-3 text-[0.875rem] leading-relaxed text-[var(--mk-muted)]">
                No card required. The demo is a real account, seeded with six
                weeks of trading and reset every few hours.
              </p>
            </div>
          </div>
        </div>

        <BrowserFrame
          src="/assets/images/landing/performance.png"
          alt="ProfitPulse pulse detail showing an equity curve, 65% win rate and 3.5 profit factor"
          label="pulse/nq-momentum · performance"
          priority
        />
      </section>

      {/* ── Manifesto ────────────────────────────────────────────────────── */}
      <section className="mt-20 border-y border-[var(--mk-line)] sm:mt-28">
        <div className="mx-auto max-w-[80rem] px-4 py-14 sm:px-6 sm:py-20">
          <p className="max-w-4xl text-[clamp(1.5rem,3.5vw,2.75rem)] font-medium leading-[1.15] tracking-[-0.01em]">
            Discipline is not a dashboard metric. It is what you are allowed to
            do next. Every other journal reports the damage after it is done.
            This one pushes back.
          </p>
        </div>
      </section>

      {/* ── Discipline Engine ────────────────────────────────────────────── */}
      <section
        id="discipline"
        className="mx-auto max-w-[80rem] scroll-mt-14 px-4 py-16 sm:px-6 sm:py-24"
      >
        <div className="grid grid-cols-12 gap-x-6 gap-y-6">
          <h2 className="col-span-12 text-[clamp(1.875rem,3.5vw,3rem)] font-semibold leading-tight tracking-[-0.02em] lg:col-span-5">
            A score you can&apos;t argue with.
          </h2>
          <div className="col-span-12 lg:col-span-6 lg:col-start-7">
            <p className="text-[1.0625rem] leading-relaxed text-[var(--mk-muted)]">
              The engine runs entirely server-side, at the moment you submit a
              trade. It reads your prices, your stop, your rule checklist, and
              it decides what your session just cost you. There is no popup to
              dismiss and nothing to game. Recovery is earned the same way the
              damage was done: in the market, one clean session at a time.
            </p>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-12 items-start gap-x-6 gap-y-10">
          <div className="col-span-12 lg:col-span-7">
            <table className="w-full border border-[var(--mk-line)] text-[0.9375rem]">
              <caption className="sr-only">
                Discipline score penalties and recovery credits
              </caption>
              <thead>
                <tr className="border-b border-[var(--mk-line)]">
                  <th scope="col" className="px-4 py-3 text-left font-semibold">
                    What the engine sees
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody>
                {penalties.map((p) => (
                  <tr key={p.violation} className="border-b border-[var(--mk-line-soft)]">
                    <td className="px-4 py-2.5">{p.violation}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">
                      {p.points}
                    </td>
                  </tr>
                ))}
                {recoveries.map((r) => (
                  <tr
                    key={r.action}
                    className="border-b border-[var(--mk-line-soft)] last:border-b-0"
                  >
                    <td className="px-4 py-2.5">{r.action}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-medium tabular-nums text-[var(--mk-green)]">
                      {r.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 font-mono text-xs text-[var(--mk-muted)]">
              Penalties amplify in degraded zones. Recovery is capped per day.
            </p>
          </div>

          <div className="col-span-12 lg:col-span-5">
            <table className="w-full border border-[var(--mk-line)] text-[0.9375rem]">
              <caption className="sr-only">
                Enforcement tiers by discipline score
              </caption>
              <thead>
                <tr className="border-b border-[var(--mk-line)]">
                  <th scope="col" className="px-4 py-3 text-left font-semibold">
                    Score
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-semibold">
                    Consequence
                  </th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((t) => (
                  <tr key={t.band} className="border-b border-[var(--mk-line-soft)] last:border-b-0">
                    <td className="whitespace-nowrap px-4 py-2.5 align-top tabular-nums">
                      {t.band}
                    </td>
                    <td className="px-4 py-2.5 text-[var(--mk-muted)]">
                      {t.consequence}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 font-mono text-xs text-[var(--mk-muted)]">
              The ladder is public. Where you stand is not negotiable.
            </p>
          </div>
        </div>

        <div className="mt-14">
          <BrowserFrame
            src="/assets/images/landing/discipline.png"
            alt="Discipline tab of a degraded pulse: score 59, At Risk zone, active 50% risk cap and a no-trade-day warning"
            label="pulse/gold-scalps · discipline"
          />
          <p className="mx-auto mt-4 max-w-3xl text-center text-[0.9375rem] leading-relaxed text-[var(--mk-muted)]">
            This screenshot is not a mockup. It is the live demo account,
            sitting at 59 after two risk breaches and a drawdown day, with the
            50% cap applied and a no-trade day armed on the next breach.
          </p>
        </div>
      </section>

      {/* ── Product rows ─────────────────────────────────────────────────── */}
      <section id="product" className="scroll-mt-14 border-t border-[var(--mk-line)]">
        <div className="mx-auto max-w-[80rem] px-4 sm:px-6">
          <div className="grid grid-cols-12 items-center gap-x-6 gap-y-8 py-16 sm:py-20">
            <div className="col-span-12 lg:col-span-4">
              <h2 className="text-[clamp(1.75rem,3vw,2.5rem)] font-semibold leading-tight tracking-[-0.02em]">
                Constraints you acknowledge, or you don&apos;t trade.
              </h2>
              <p className="mt-5 max-w-md text-[1.0625rem] leading-relaxed text-[var(--mk-muted)]">
                When caps are active, the session opens with a gate: your
                constraints and your own WHY, before a single trade is logged.
                Capped trades need an explicit acknowledged submit. A no-trade
                day makes you type it out. Nothing is silently blocked, and
                nothing slips through unnoticed.
              </p>
            </div>
            <div className="col-span-12 lg:col-span-8">
              <BrowserFrame
                src="/assets/images/landing/session-gate.png"
                alt="Session gate requiring acknowledgement of an active 50% risk cap before trading"
                label="pulse/gold-scalps · session gate"
              />
            </div>
          </div>

          <div className="grid grid-cols-12 items-center gap-x-6 gap-y-8 border-t border-[var(--mk-line-soft)] py-16 sm:py-20">
            <div className="col-span-12 lg:col-span-4 lg:order-2">
              <h2 className="text-[clamp(1.75rem,3vw,2.5rem)] font-semibold leading-tight tracking-[-0.02em]">
                A week you can read in one column.
              </h2>
              <p className="mt-5 max-w-md text-[1.0625rem] leading-relaxed text-[var(--mk-muted)]">
                Trades grouped by day, with win rate and P/L per session. Every
                entry carries its execution, psychology, market context and
                reflection, so the Sunday review takes minutes. The lesson sits
                next to the number it explains.
              </p>
            </div>
            <div className="col-span-12 lg:col-span-8 lg:order-1">
              <BrowserFrame
                src="/assets/images/landing/trade-log.png"
                alt="Trade log grouped by day with per-session win rate and profit and loss"
                label="pulse/nq-momentum · trade log"
              />
            </div>
          </div>

          <div className="grid grid-cols-12 items-center gap-x-6 gap-y-8 border-t border-[var(--mk-line-soft)] py-16 sm:py-20">
            <div className="col-span-12 lg:col-span-4">
              <h2 className="text-[clamp(1.75rem,3vw,2.5rem)] font-semibold leading-tight tracking-[-0.02em]">
                One strategy, one pulse, one set of rules.
              </h2>
              <p className="mt-5 max-w-md text-[1.0625rem] leading-relaxed text-[var(--mk-muted)]">
                Each Pulse holds its own account size, risk parameters, rule
                checklist and discipline state. The dashboard rolls it all up:
                P/L, profit factor, strike rate, average win and loss. Your
                scalping habit can&apos;t hide inside your swing results.
              </p>
            </div>
            <div className="col-span-12 lg:col-span-8">
              <BrowserFrame
                src="/assets/images/landing/dashboard.png"
                alt="Dashboard with aggregate statistics and two trading pulses"
                label="dashboard"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Capability index ─────────────────────────────────────────────── */}
      <section className="border-t border-[var(--mk-line)]">
        <div className="mx-auto max-w-[80rem] px-4 py-16 sm:px-6 sm:py-24">
          <h2 className="text-[clamp(1.875rem,3.5vw,3rem)] font-semibold leading-tight tracking-[-0.02em]">
            What&apos;s in the box.
          </h2>
          <dl className="mt-10 border-t border-[var(--mk-line)]">
            {capabilities.map((c) => (
              <div
                key={c.term}
                className="grid grid-cols-12 gap-x-6 gap-y-2 border-b border-[var(--mk-line-soft)] py-5"
              >
                <dt className="col-span-12 font-semibold md:col-span-4 lg:col-span-3">
                  {c.term}
                </dt>
                <dd className="col-span-12 max-w-2xl text-[0.9375rem] leading-relaxed text-[var(--mk-muted)] md:col-span-8 lg:col-span-9">
                  {c.detail}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── The loop ─────────────────────────────────────────────────────── */}
      <section className="border-t border-[var(--mk-line)]">
        <div className="mx-auto max-w-[80rem] px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid gap-10 md:grid-cols-3 md:gap-6">
            {loop.map((s) => (
              <div key={s.lead} className="border-t-2 border-[var(--mk-line)] pt-5">
                <h2 className="text-2xl font-semibold tracking-[-0.01em]">
                  {s.lead}
                </h2>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-[var(--mk-muted)]">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section
        id="pricing"
        className="scroll-mt-14 border-t border-[var(--mk-line)] bg-[var(--mk-invert-bg)] text-[var(--mk-invert-ink)]"
      >
        <div className="mx-auto max-w-[80rem] px-4 py-20 sm:px-6 sm:py-28">
          <div className="grid grid-cols-12 gap-x-6 gap-y-10">
            <div className="col-span-12 lg:col-span-8">
              <h2 className="text-[clamp(2.5rem,6vw,5rem)] font-semibold leading-[0.98] tracking-[-0.03em]">
                Free during beta.
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--mk-invert-muted)]">
                ProfitPulse is free while we build in the open, and the first
                100 beta users are grandfathered into a free lifetime plan.
                Help shape the product. Keep it forever.
              </p>
            </div>
            <div className="col-span-12 self-end lg:col-span-4">
              <div className="flex flex-col gap-3">
                <Link
                  href="/signup"
                  className="border border-[var(--mk-green-strong)] bg-[var(--mk-green-strong)] px-6 py-3.5 text-center font-medium text-white hover:bg-[var(--mk-invert-ink)] hover:border-[var(--mk-invert-ink)] hover:text-[var(--mk-invert-bg)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--mk-invert-ink)]"
                >
                  Claim a lifetime spot
                </Link>
                <Link
                  href="/login?demo=1"
                  className="border border-[var(--mk-invert-ink)] px-6 py-3.5 text-center font-medium text-[var(--mk-invert-ink)] hover:bg-[var(--mk-invert-ink)] hover:text-[var(--mk-invert-bg)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--mk-invert-ink)]"
                >
                  Kick the tires first
                </Link>
              </div>
              <p className="mt-3 text-[0.875rem] text-[var(--mk-invert-muted)]">
                No card. No sales call. Cancel by closing the tab.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
