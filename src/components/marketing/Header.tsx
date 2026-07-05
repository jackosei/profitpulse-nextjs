import Link from "next/link";
import ThemeToggle from "@/components/marketing/ThemeToggle";

/** Marketing chrome: hairline-ruled header, set-in-type wordmark (the SVG
 *  logo is white and built for the app's dark chrome). */
export default function MarketingHeader() {
  const navLink =
    "text-[var(--mk-ink)] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--mk-ink)]";

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--mk-line)] bg-[var(--mk-bg)]">
      <div className="mx-auto flex h-14 max-w-[80rem] items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--mk-ink)]"
          aria-label="ProfitPulse home"
        >
          Profit<span className="text-[var(--mk-green)]">Pulse</span>
        </Link>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-7 text-[0.9375rem] md:flex"
        >
          <a href="#discipline" className={navLink}>
            The engine
          </a>
          <a href="#product" className={navLink}>
            Product
          </a>
          <a href="#pricing" className={navLink}>
            Pricing
          </a>
          <Link
            href="/login?demo=1"
            className="text-[var(--mk-ink)] underline underline-offset-4 decoration-[var(--mk-green)] decoration-2 hover:decoration-[var(--mk-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--mk-ink)]"
          >
            Live demo
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="hidden text-[0.9375rem] underline-offset-4 hover:underline sm:block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--mk-ink)]"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="border border-[var(--mk-ink)] bg-[var(--mk-ink)] px-4 py-2 text-[0.9375rem] font-medium text-[var(--mk-bg)] hover:bg-[var(--mk-green-strong)] hover:border-[var(--mk-green-strong)] hover:text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--mk-ink)]"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
