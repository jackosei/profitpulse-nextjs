"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { navigationLinks } from "@/config/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  HomeIcon,
  ChartBarIcon,
  UserIcon,
  ChartPieIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

const iconMap = {
  '/': <HomeIcon className="w-6 h-6" />,
  '/dashboard': <ChartBarIcon className="w-6 h-6" />,
  '/pulses': <ChartPieIcon className="w-6 h-6" />,
  '/profile': <UserIcon className="w-6 h-6" />,
};

export default function Sidebar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(true);

  if (!user) return null;

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === href
      : pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:block relative h-full bg-white shadow-md border-r border-gray-200 transition-all duration-300 ease-in-out">
        <div className={`h-full ${collapsed ? "w-16" : "w-auto"} flex flex-col justify-between`}>
          <nav className="p-4 pt-6">
            <ul className="space-y-2">
              {navigationLinks.map((link) => {
                const active = isActive(link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={`flex ${collapsed ? "justify-center" : "justify-start"} items-center p-2 rounded transition-colors ${
                        active
                          ? "bg-accent/10 text-accent"
                          : "text-gray-700 hover:bg-gray-100 hover:text-accent"
                      }`}
                    >
                      <span className="flex-shrink-0">
                        {iconMap[link.href as keyof typeof iconMap]}
                      </span>
                      {!collapsed && (
                        <span className="ml-3">{link.label}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* Collapse toggle — sits on the right border, vertically centred */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 flex items-center justify-center w-5 h-10 bg-white border border-gray-200 rounded-full shadow-sm text-gray-400 hover:text-accent hover:border-accent transition-colors"
        >
          {collapsed
            ? <ChevronRightIcon className="w-3 h-3" />
            : <ChevronLeftIcon className="w-3 h-3" />
          }
        </button>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex justify-around items-center h-16">
          {navigationLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
                  active ? "text-accent" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <span className="flex-shrink-0">
                  {iconMap[link.href as keyof typeof iconMap]}
                </span>
                <span className="text-xs mt-1">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
