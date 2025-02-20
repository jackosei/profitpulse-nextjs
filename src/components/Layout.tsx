import { ReactNode } from "react";
import Link from "next/link";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md p-4">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          📈 Profit Pulse
        </h2>
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

      {/* Main Content */}
      <main className="flex-1 p-6">
        {/* Navbar */}
        <header className="flex justify-between items-center bg-white p-4 shadow-md rounded-lg">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <button className="px-4 py-2 bg-red-500 text-white rounded-lg">
            Logout
          </button>
        </header>

        {/* Page Content */}
        <div className="mt-4">{children}</div>
      </main>
    </div>
  );
}
