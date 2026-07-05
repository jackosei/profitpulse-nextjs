import Link from "next/link";

export default function MarketingFooter() {
  const link =
    "underline-offset-4 hover:underline hover:text-[var(--mk-ink)]";

  return (
    <footer className="border-t border-[var(--mk-line)] bg-[var(--mk-bg)]">
      <div className="mx-auto max-w-[80rem] px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-6">
            <p className="text-lg font-semibold tracking-tight">
              Profit<span className="text-[var(--mk-green)]">Pulse</span>
            </p>
            <p className="mt-3 max-w-sm text-[0.9375rem] leading-relaxed text-[var(--mk-muted)]">
              The trading journal that enforces your rules, not just records
              them.
            </p>
          </div>

          <nav aria-label="Product" className="md:col-span-3">
            <p className="font-medium">Product</p>
            <ul className="mt-3 space-y-2 text-[0.9375rem] text-[var(--mk-muted)]">
              <li>
                <a href="#discipline" className={link}>
                  The Discipline Engine
                </a>
              </li>
              <li>
                <a href="#product" className={link}>
                  Product
                </a>
              </li>
              <li>
                <Link href="/login?demo=1" className={link}>
                  Live demo
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Account" className="md:col-span-3">
            <p className="font-medium">Get started</p>
            <ul className="mt-3 space-y-2 text-[0.9375rem] text-[var(--mk-muted)]">
              <li>
                <Link href="/signup" className={link}>
                  Create account
                </Link>
              </li>
              <li>
                <Link href="/login" className={link}>
                  Sign in
                </Link>
              </li>
              <li>
                <a href="mailto:hello@profitpulse.app" className={link}>
                  hello@profitpulse.app
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <p className="mt-12 border-t border-[var(--mk-line-soft)] pt-6 text-[0.8125rem] leading-relaxed text-[var(--mk-muted)]">
          © {new Date().getFullYear()} ProfitPulse. Trading involves risk of
          loss; past performance is not indicative of future results.
        </p>
      </div>
    </footer>
  );
}
