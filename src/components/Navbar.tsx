"use client";

import { useAuth } from "@/context/AuthContext";
import { logout } from "@/firebase/auth";
import Link from "next/link";

export default function Navbar() {
  const { user } = useAuth();

  return (
    <header className="flex justify-between items-center bg-white p-4 shadow-md rounded-lg">
      <nav>
        <ul className="space-y-2">
          <li>
            <Link
              href="/"
              className="block p-2 text-gray-700 hover:bg-gray-200 rounded"
            >
              Dashboard
            </Link>
          </li>
          <li>
            <Link
              href="/trades"
              className="block p-2 text-gray-700 hover:bg-gray-200 rounded"
            >
              Trades
            </Link>
          </li>
          <li>
            <Link
              href="/profile"
              className="block p-2 text-gray-700 hover:bg-gray-200 rounded"
            >
              Profile
            </Link>
          </li>
        </ul>
      </nav>
      {user && (
        <button
          className="px-4 py-2 bg-red-500 text-white rounded-lg"
          onClick={logout}
        >
          Logout
        </button>
      )}
    </header>
  );
}
