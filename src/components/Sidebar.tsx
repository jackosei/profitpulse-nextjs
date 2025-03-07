"use client";

import Link from "next/link";
import { useState } from "react";
import { navigationLinks } from "@/config/navigation";
import { useAuth } from "@/context/AuthContext";
import { 
  HomeIcon, 
  ChartBarIcon, 
  Cog6ToothIcon as CogIcon, 
  Bars3Icon as MenuIcon,
  XMarkIcon as XIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

// Map of icons for each route
const iconMap = {
  '/': <HomeIcon className="w-6 h-6" />,
  '/dashboard': <ChartBarIcon className="w-6 h-6" />,
  '/profile': <UserIcon className="w-6 h-6" />,
};

export default function Sidebar() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  if (!user) return null;

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:block h-screen sticky top-0 bg-white shadow-md border-r border-gray-200 transition-all duration-300 ease-in-out">
        <div className={`h-full ${collapsed ? "w-16" : "w-64"}`}>
          <div className="p-4 border-b border-gray-200">
            <button
              className={`w-full flex justify-center items-center h-8 text-gray-700 hover:bg-gray-100 hover:text-accent rounded transition-colors ${collapsed ? "text-accent" : "text-gray-700"}`}
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <MenuIcon className="w-6 h-6" />
              ) : (
                <XIcon className="w-6 h-6" />
              )}
            </button>
          </div>
          <nav className="p-4">
            <ul className="space-y-2">
              {navigationLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`flex ${collapsed ? "justify-center" : "justify-start"} items-center p-2 text-gray-700 hover:bg-gray-100 hover:text-accent rounded transition-colors text-gray-700`}
                  >
                    <span className="flex-shrink-0">
                      {iconMap[link.href as keyof typeof iconMap]}
                    </span>
                    {!collapsed && (
                      <span className="ml-3">{link.label}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex justify-around items-center h-16">
          {navigationLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex flex-col items-center justify-center w-full h-full text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <span className="flex-shrink-0">
                {iconMap[link.href as keyof typeof iconMap]}
              </span>
              <span className="text-xs mt-1">{link.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
