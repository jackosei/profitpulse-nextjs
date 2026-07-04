import MarketingHeader from "@/components/marketing/Header";
import MarketingFooter from "@/components/marketing/Footer";

/**
 * Public marketing layout — editorial light theme, deliberately separate from
 * the app's dark chrome. Type is set in a grotesk stack (Söhne / Untitled
 * Sans / Neue Haas, falling back to Helvetica Neue); drop licensed font files
 * in when available and they pick up automatically.
 *
 * Colour system (AAA body contrast on paper):
 *   paper #F6F4EF · ink #131512 · muted #454B46 · brand green #08835A
 * Note: uses literal hex utilities throughout — globals.css remaps
 * .bg-white/.text-gray-900/etc. to dark-theme values.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen bg-[#F6F4EF] text-[#131512] antialiased"
      style={{
        fontFamily:
          "'Söhne', 'Untitled Sans', 'Neue Haas Grotesk Display', 'Neue Haas Unica', 'Helvetica Neue', Helvetica, Arial, sans-serif",
      }}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-[#131512] focus:px-4 focus:py-2 focus:text-[#F6F4EF]"
      >
        Skip to content
      </a>
      <MarketingHeader />
      <main id="main">{children}</main>
      <MarketingFooter />
    </div>
  );
}
