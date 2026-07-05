import MarketingHeader from "@/components/marketing/Header";
import MarketingFooter from "@/components/marketing/Footer";

/**
 * Public marketing layout. Editorial, dark by default (aligned with the app's
 * theme) with a persisted light-mode toggle; all colours flow through the
 * .mk-root CSS variables defined in globals.css, so the app chrome is never
 * affected. Type is set in a grotesk stack (Söhne / Untitled Sans / Neue
 * Haas, falling back to Helvetica Neue); drop licensed font files in when
 * available and they pick up automatically.
 */

// Applies the stored light theme before first paint so there is no flash.
const themeInit = `(function(){try{if(localStorage.getItem('mk-theme')==='light'){document.currentScript.parentElement.setAttribute('data-theme','light')}}catch(e){}})()`;

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      suppressHydrationWarning
      className="mk-root min-h-screen bg-[var(--mk-bg)] text-[var(--mk-ink)] antialiased"
      style={{
        fontFamily:
          "'Söhne', 'Untitled Sans', 'Neue Haas Grotesk Display', 'Neue Haas Unica', 'Helvetica Neue', Helvetica, Arial, sans-serif",
      }}
    >
      <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-[var(--mk-ink)] focus:px-4 focus:py-2 focus:text-[var(--mk-bg)]"
      >
        Skip to content
      </a>
      <MarketingHeader />
      <main id="main">{children}</main>
      <MarketingFooter />
    </div>
  );
}
