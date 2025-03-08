"use client";

import { useAuth } from "@/context/AuthContext";
import { auth } from "@/services/config";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { UserCircleIcon } from "@heroicons/react/24/outline";

export default function Navbar() {
  const { user } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

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
              <div className="relative">
                {/* Profile Image/Avatar Button */}
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
                      <p className="text-sm text-gray-300">{user.displayName}</p>
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
            ) : (
              <>
                <Link 
                  href="/login"
                  className="text-gray-300 hover:text-accent transition-colors"
                >
                  Login
                </Link>
                <Link 
                  href="/signup"
                  className="btn-primary"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
