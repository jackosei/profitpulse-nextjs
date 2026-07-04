import Image from "next/image";
import Link from "next/link";

export default function MarketingFooter() {
  return (
    <footer className="border-t border-white/5 bg-dark-darker">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row">
          <div className="max-w-xs">
            <div className="relative h-8 w-32">
              <Image
                src="/assets/images/ProfitPulse.svg"
                alt="ProfitPulse"
                fill
                className="object-contain object-left"
              />
            </div>
            <p className="mt-3 text-sm text-gray-400">
              The trading journal that enforces your rules — not just records
              them.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-12 text-sm">
            <div>
              <p className="mb-3 font-semibold text-gray-200">Product</p>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#discipline" className="hover:text-white transition-colors">
                    Discipline Engine
                  </a>
                </li>
                <li>
                  <a href="#features" className="hover:text-white transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <Link href="/login?demo=1" className="hover:text-white transition-colors">
                    Live demo
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="mb-3 font-semibold text-gray-200">Get started</p>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="/signup" className="hover:text-white transition-colors">
                    Create account
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-white transition-colors">
                    Sign in
                  </Link>
                </li>
                <li>
                  <a
                    href="mailto:hello@profitpulse.app"
                    className="hover:text-white transition-colors"
                  >
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <p className="mt-10 border-t border-white/5 pt-6 text-xs text-gray-500">
          © {new Date().getFullYear()} ProfitPulse. Trade at your own risk —
          past performance is not indicative of future results.
        </p>
      </div>
    </footer>
  );
}
