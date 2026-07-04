import Image from "next/image";

/**
 * In-app screenshot in a hard-ruled editorial frame: hairline ink border,
 * mono caption bar, no chrome theatrics. Screenshots are 1600px-wide
 * captures of the live seeded demo account.
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
    <figure className="border border-[#131512] bg-[#131512]">
      <figcaption className="flex items-baseline justify-between gap-4 border-b border-[#131512] bg-[#F6F4EF] px-3 py-2 font-mono text-xs text-[#131512]">
        <span className="truncate">{label}</span>
        <span className="shrink-0 text-[#454B46]">live demo data</span>
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
