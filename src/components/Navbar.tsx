"use client";

import { useAuth } from "@/context/AuthContext";
import { auth } from "@/firebase/config";
import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
  const { user } = useAuth();

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
                <div className="flex items-center gap-3">
                  {user.photoURL && (
                    <Image
                      src={user.photoURL}
                      alt={user.displayName || "User"}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  )}
                  <span className="text-gray-300">{user.displayName}</span>
                </div>
                <button 
                  onClick={() => auth.signOut()}
                  className="btn-primary bg-red-500 hover:bg-red-600"
                >
                  Logout
                </button>
              </>
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
