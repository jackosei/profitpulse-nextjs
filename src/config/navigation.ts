// Desktop sidebar — Pulses is handled separately (collapsible); Profile lives in the footer
export const navigationLinks = [
  { href: "/dashboard", label: "Dashboard" },
];

// Mobile bottom nav — Profile stays accessible here since the sidebar footer isn't visible
export const mobileNavLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/pulses",    label: "Pulses"    },
  { href: "/profile",   label: "Profile"   },
];
