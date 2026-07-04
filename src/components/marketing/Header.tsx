import Link from "next/link";

/** Marketing chrome: hairline-ruled header, set-in-type wordmark (the SVG
 *  logo is white and built for the app's dark chrome). */
export default function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#131512] bg-[#F6F4EF]">
      <div className="mx-auto flex h-14 max-w-[80rem] items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#131512]"
          aria-label="ProfitPulse home"
        >
          Profit<span className="text-[#08835A]">Pulse</span>
        </Link>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-7 text-[0.9375rem] md:flex"
        >
          <a
            href="#discipline"
            className="text-[#131512] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#131512]"
          >
            The engine
          </a>
          <a
            href="#product"
            className="text-[#131512] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#131512]"
          >
            Product
          </a>
          <a
            href="#pricing"
            className="text-[#131512] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#131512]"
          >
            Pricing
          </a>
          <Link
            href="/login?demo=1"
            className="text-[#131512] underline underline-offset-4 decoration-[#08835A] decoration-2 hover:decoration-[#131512] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#131512]"
          >
            Live demo
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="hidden text-[0.9375rem] underline-offset-4 hover:underline sm:block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#131512]"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="border border-[#131512] bg-[#131512] px-4 py-2 text-[0.9375rem] font-medium text-[#F6F4EF] hover:bg-[#08835A] hover:border-[#08835A] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#131512]"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
