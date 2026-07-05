import Image from "next/image";

/**
 * In-app screenshot in a hard-ruled frame with browser-dot chrome and a mono
 * route caption. Screenshots are 1600px-wide captures of the live seeded
 * demo account.
 */
export default function BrowserFrame({
  src,
  alt,
  label,
  priority = false,
}: {
  src: string;
  alt: string;
  /** Route-style caption shown in the frame's top bar, e.g. "pulse/gold-scalps · discipline" */
  label: string;
  priority?: boolean;
}) {
  return (
    <figure className="border border-[var(--mk-line)] bg-[#0e1420]">
      <figcaption className="flex items-center justify-between gap-4 border-b border-[var(--mk-line)] bg-[var(--mk-surface)] px-3 py-2.5">
        <span className="flex shrink-0 items-center gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-[#ec6a5e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#f4bf4f]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#61c554]" />
        </span>
        <span className="min-w-0 flex-1 truncate text-center font-mono text-xs text-[var(--mk-ink)]">
          {label}
        </span>
        <span className="shrink-0 font-mono text-xs text-[var(--mk-muted)]">
          live demo data
        </span>
      </figcaption>
      <Image
        src={src}
        alt={alt}
        width={1600}
        height={1000}
        priority={priority}
        className="h-auto w-full"
        sizes="(min-width: 1024px) 60rem, 100vw"
      />
    </figure>
  );
}
