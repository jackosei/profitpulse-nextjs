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
  '/dashboard': <HomeIcon className="w-6 h-6" />,
  '/trades': <ChartBarIcon className="w-6 h-6" />,
  '/settings': <CogIcon className="w-6 h-6" />,
  '/profile': <UserIcon className="w-6 h-6" />,
};

export default function Sidebar() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  if (!user) return null;

  return (
    <aside
      className={`h-screen sticky top-0 bg-white shadow-md border-r border-gray-200 transition-all duration-300 ease-in-out ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="p-4 border-b border-gray-200">
        <button
          className="w-full flex justify-center items-center h-8 text-gray-700 hover:bg-gray-100 rounded transition-colors"
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
                className="flex items-center p-2 text-gray-700 hover:bg-gray-100 rounded transition-colors"
              >
                {/* Show icon if it exists in the map */}
                <span className="flex-shrink-0">
                  {iconMap[link.href as keyof typeof iconMap]}
                </span>
                
                {/* Show label only when not collapsed */}
                {!collapsed && (
                  <span className="ml-3">{link.label}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
