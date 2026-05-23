"use client";

import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import {
  CalculatorIcon,
  ArrowRightStartOnRectangleIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
  BugAntIcon,
  BookOpenIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";
import LotSizeCalculatorModal from "@/components/modals/LotSizeCalculatorModal";
import ContactModal from "@/components/modals/ContactModal";
import { useParams, useRouter } from "next/navigation";
import { usePulse } from "@/hooks/usePulse";
import type { Pulse } from "@/types/pulse";

const HELP_ITEMS = [
  {
    label: "Request a feature",
    icon: SparklesIcon,
    href: "https://profitpulse.featurebase.app/",
  },
  {
    label: "Report a bug",
    icon: BugAntIcon,
    href: "https://profitpulse.featurebase.app/",
  },
  {
    label: "Learning resources",
    icon: BookOpenIcon,
    href: "https://profitpulse.featurebase.app/",
  },
  {
    label: "Contact developers",
    icon: EnvelopeIcon,
    href: "contact" as string,
  },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const params = useParams();
  const router = useRouter();
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [currentPulse, setCurrentPulse] = useState<Pulse | null>(null);
  const { getPulseById } = usePulse();
  const helpRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setConfirmLogout(false);
    const pulseId = params?.id as string;
    if (pulseId && user) {
      getPulseById(pulseId, user.uid)
        .then(setCurrentPulse)
        .catch(() => setCurrentPulse(null));
    } else {
      setCurrentPulse(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id, user]);

  // Close help dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) {
        setHelpOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="sticky top-0 z-10 w-full bg-dark border-b border-gray-800">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="relative w-32 h-8">
            <Image
              src="/assets/images/ProfitPulse.svg"
              alt="ProfitPulse Logo"
              fill
              className="object-contain"
              priority
            />
          </Link>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <button
                  onClick={() => setIsCalculatorOpen(true)}
                  className="flex items-center justify-center w-9 h-9 rounded-md text-gray-400 bg-gray-800 hover:bg-gray-600 hover:text-white transition-colors"
                  title="Position Size Calculator"
                >
                  <CalculatorIcon className="h-5 w-5" />
                  {/* <span className="hidden sm:inline">Calculator</span> */}
                </button>

                {/* Help dropdown */}
                <div className="relative" ref={helpRef}>
                  <button
                    onClick={() => setHelpOpen(o => !o)}
                    className="flex items-center justify-center w-9 h-9 rounded-md text-gray-400 bg-gray-800 hover:bg-gray-600 hover:text-white transition-colors"
                    title="Help"
                  >
                    <QuestionMarkCircleIcon className="h-5 w-5" />
                  </button>

                  {helpOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-dark border border-gray-800 rounded-lg shadow-xl pt-1 z-50 overflow-hidden">
                      <p className="px-3 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Help &amp; Feedback
                      </p>
                      {HELP_ITEMS.map(({ label, icon: Icon, href }) =>
                        href === "contact" ? (
                          <button
                            key={label}
                            onClick={() => { setContactModalOpen(true); setHelpOpen(false); }}
                            className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                          >
                            <Icon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            {label}
                          </button>
                        ) : (
                          <a
                            key={label}
                            href={href}
                            target={href.startsWith("http") ? "_blank" : undefined}
                            rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                            onClick={() => setHelpOpen(false)}
                            className="flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                          >
                            <Icon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            {label}
                          </a>
                        )
                      )}
                    </div>
                  )}
                </div>

                {/* Logout — inline confirmation */}
                {confirmLogout ? (
                  <div className="flex items-center gap-2 px-3 py-2 border border-gray-700 rounded-md bg-gray-900">
                    <span className="text-sm text-gray-300">Sign out?</span>
                    <button
                      onClick={async () => {
                        await logout();
                        router.replace('/login');
                      }}
                      className="text-sm font-medium text-red-400 hover:text-red-300 transition-colors"
                    >
                      Yes
                    </button>
                    <span className="text-gray-600">·</span>
                    <button
                      onClick={() => setConfirmLogout(false)}
                      className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmLogout(true)}
                    className="flex items-center justify-center w-9 h-9 rounded-md text-gray-400 bg-gray-800 hover:bg-gray-600 hover:text-red-400 transition-colors"
                    title="Sign out"
                  >
                    <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
                  </button>
                )}
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-gray-300 hover:text-accent transition-colors"
                >
                  Login
                </Link>
                <Link href="/signup" className="btn-primary">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <LotSizeCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        pulse={currentPulse || undefined}
      />
      <ContactModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
      />
    </header>
  );
}
