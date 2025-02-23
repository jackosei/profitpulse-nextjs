"use client"; // Enables client-side interactivity

import Link from "next/link";
import { useState } from "react";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`w-64 bg-white shadow-md p-4 ${collapsed ? "w-16" : "w-64"}`}
    >
      <button
        className="text-gray-700 mb-4"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? "☰" : "✖"}
      </button>
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
    </aside>
  );
}
