"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { navigationLinks, mobileNavLinks } from "@/config/navigation";
import { useAuth } from "@/context/AuthContext";
import { usePulse } from "@/hooks/usePulse";
import { PULSE_STATUS, type Pulse } from "@/types/pulse";
import {
  ChartBarIcon,
  UserIcon,
  ChartPieIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';

const iconMap: Record<string, React.ReactNode> = {
  '/dashboard': <ChartBarIcon className="w-6 h-6" />,
  '/pulses':    <ChartPieIcon className="w-6 h-6" />,
  '/profile':   <UserIcon className="w-6 h-6" />,
};

export default function Sidebar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const { getUserPulses } = usePulse();
  const [collapsed, setCollapsed] = useState(true);
  const [activePulses, setActivePulses] = useState<Pulse[]>([]);
  const [pulsesOpen, setPulsesOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    getUserPulses(user.uid, PULSE_STATUS.ACTIVE)
      .then(p => setActivePulses(p ?? []))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Auto-expand pulse sub-list when viewing a pulse detail page
  useEffect(() => {
    if (pathname.startsWith('/pulse/')) setPulsesOpen(true);
  }, [pathname]);

  if (!user) return null;

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === href
      : pathname === href || pathname.startsWith(href + '/');

  const pulsesActive = isActive('/pulses');

  const initials = (user.displayName ?? user.email ?? '?')
    .split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex relative h-full bg-white shadow-md border-r border-gray-200 transition-all duration-300 ease-in-out flex-col">
        <div className={`h-full flex flex-col ${collapsed ? "w-16" : "w-64"}`}>

          {/* Nav links */}
          <nav className="flex-1 p-4 pt-6 space-y-1">
            {/* Static links (Dashboard, etc.) */}
            {navigationLinks.map(link => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex ${collapsed ? "justify-center" : "justify-start"} items-center p-2 rounded transition-colors ${
                    active
                      ? "bg-accent/10 text-accent"
                      : "text-gray-700 hover:bg-gray-100 hover:text-accent"
                  }`}
                >
                  <span className="flex-shrink-0">{iconMap[link.href]}</span>
                  {!collapsed && <span className="ml-3">{link.label}</span>}
                </Link>
              );
            })}

            {/* Pulses — collapsible when expanded and has active pulses */}
            <div>
              <div className={`flex items-center rounded transition-colors ${pulsesActive ? "bg-accent/10 text-accent" : "text-gray-700"}`}>
                <Link
                  href="/pulses"
                  className={`flex flex-1 ${collapsed ? "justify-center" : "justify-start"} items-center p-2 hover:text-accent transition-colors`}
                >
                  <span className="flex-shrink-0"><ChartPieIcon className="w-6 h-6" /></span>
                  {!collapsed && <span className="ml-3">Pulses</span>}
                </Link>
                {!collapsed && activePulses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setPulsesOpen(o => !o)}
                    className="pr-2 hover:text-accent transition-colors"
                    aria-label={pulsesOpen ? "Collapse pulses" : "Expand pulses"}
                  >
                    <ChevronDownIcon
                      className={`w-4 h-4 transition-transform ${pulsesOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                )}
              </div>

              {!collapsed && pulsesOpen && activePulses.length > 0 && (
                <ul className="mt-1 pl-9 space-y-1">
                  {activePulses.map(pulse => {
                    const pulseActive = pathname === `/pulse/${pulse.firestoreId}`;
                    return (
                      <li key={pulse.firestoreId ?? pulse.id}>
                        <Link
                          href={`/pulse/${pulse.firestoreId}`}
                          className={`block py-1 px-2 text-sm rounded truncate max-w-[170px] transition-colors ${
                            pulseActive
                              ? "text-accent font-medium"
                              : "text-gray-600 hover:text-accent hover:bg-gray-100"
                          }`}
                          title={pulse.name}
                        >
                          {pulse.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </nav>

          {/* Profile footer */}
          <div className="border-t border-gray-200 p-3 space-y-1">
            <Link
              href="/profile"
              className={`group flex ${collapsed ? "justify-center" : "justify-start hover:bg-gray-100"} items-center gap-3 p-2 rounded transition-colors ${isActive('/profile') ? "bg-accent/10" : ""}`}
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 overflow-hidden ring-2 ring-accent transition-all group-hover:ring-4 group-hover:ring-accent/50">
                {user.photoURL ? (
                  <Image
                    src={user.photoURL}
                    alt={user.displayName || "User"}
                    width={32}
                    height={32}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <span className="text-accent text-sm font-semibold leading-none">
                    {initials}
                  </span>
                )}
              </div>
              {!collapsed && (
                <div className="overflow-hidden">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.displayName || "Account"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
              )}
            </Link>

          </div>
        </div>

        {/* Collapse toggle on right border */}
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
          {mobileNavLinks.map(link => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
                  active ? "text-accent" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <span className="flex-shrink-0">{iconMap[link.href]}</span>
                <span className="text-xs mt-1">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
