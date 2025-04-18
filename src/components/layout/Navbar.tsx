"use client";

import { useAuth } from "@/context/AuthContext";
import { auth } from "@/services/firestoreConfig";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { UserCircleIcon, CalculatorIcon } from "@heroicons/react/24/outline";
import LotSizeCalculatorModal from "@/components/modals/LotSizeCalculatorModal";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { getPulseById } from "@/services/firestore";
import type { Pulse } from "@/types/pulse";

export default function Navbar() {
  const { user } = useAuth();
  const params = useParams();
  const [showDropdown, setShowDropdown] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [currentPulse, setCurrentPulse] = useState<Pulse | null>(null);

  useEffect(() => {
    const pulseId = params?.id as string;
    if (pulseId && user) {
      getPulseById(pulseId, user.uid)
        .then((pulseData) => setCurrentPulse(pulseData))
        .catch((error) => {
          console.error("Error fetching pulse:", error);
          setCurrentPulse(null);
        });
    } else {
      setCurrentPulse(null);
    }
  }, [params?.id, user]);

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

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

          <div className="flex items-center gap-4">
            {user ? (
              <>
                {/* Lot Size Calculator Button */}
                <div className="flex items-center">
                  <button
                    onClick={() => setIsCalculatorOpen(true)}
                    className="inline-flex items-center px-3 py-2 border border-gray-800 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                    title="Position Size Calculator"
                  >
                    <CalculatorIcon className="h-5 w-5 mr-2" />
                    <span className="hidden sm:inline">Calculator</span>
                  </button>
                </div>
                
                  {/* Profile Image/Avatar Button */}
                <div className="relative">
                  <button
                    onClick={toggleDropdown}
                    className="flex items-center justify-center w-8 h-8 rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    {user.photoURL ? (
                      <Image
                        src={user.photoURL}
                        alt={user.displayName || "User"}
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                    ) : (
                      <UserCircleIcon className="w-8 h-8 text-gray-400" />
                    )}
                  </button>

                  {/* Dropdown Menu */}
                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-dark border border-gray-800 rounded-lg shadow-lg py-1 z-50">
                      {/* User Info - Only visible on desktop */}
                      <div className="hidden md:block px-4 py-2 border-b border-gray-800">
                        <p className="text-sm text-gray-300">
                          {user.displayName}
                        </p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>

                      {/* Navigation Links */}
                      <Link
                        href="/profile"
                        className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
                        onClick={() => setShowDropdown(false)}
                      >
                        Profile Settings
                      </Link>

                      <Link
                        href="/profile/archived"
                        className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
                        onClick={() => setShowDropdown(false)}
                      >
                        Archived Pulses
                      </Link>

                      {/* Logout Button */}
                      <button
                        onClick={() => {
                          auth.signOut();
                          setShowDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-800"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
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

      {/* Calculator Modal - Now works with or without pulse data */}
      <LotSizeCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        pulse={currentPulse || undefined}
      />
    </header>
  );
}
