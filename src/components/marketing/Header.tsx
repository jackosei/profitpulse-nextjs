import Image from "next/image";
import Link from "next/link";

export default function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-dark-darker/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="relative h-8 w-32" aria-label="ProfitPulse home">
          <Image
            src="/assets/images/ProfitPulse.svg"
            alt="ProfitPulse"
            fill
            className="object-contain object-left"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-gray-300 md:flex">
          <a href="#discipline" className="hover:text-white transition-colors">
            Discipline Engine
          </a>
          <a href="#features" className="hover:text-white transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="hover:text-white transition-colors">
            How it works
          </a>
          <a href="#pricing" className="hover:text-white transition-colors">
            Pricing
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-3 py-2 text-sm text-gray-300 hover:text-white transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
