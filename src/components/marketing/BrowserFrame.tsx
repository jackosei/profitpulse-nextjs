import Image from "next/image";

/**
 * In-app screenshot presented inside a minimal browser chrome frame.
 * Screenshots are 1600px-wide captures of the seeded demo account.
 */
export default function BrowserFrame({
  src,
  alt,
  priority = false,
  glow = false,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  glow?: boolean;
}) {
  return (
    <div className="relative">
      {glow && (
        <div
          aria-hidden
          className="absolute -inset-8 rounded-[2rem] bg-accent/20 blur-3xl"
        />
      )}
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-dark shadow-2xl shadow-black/50">
        <div className="flex items-center gap-1.5 border-b border-white/5 bg-white/[0.03] px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
        </div>
        <Image
          src={src}
          alt={alt}
          width={1600}
          height={1000}
          priority={priority}
          className="h-auto w-full"
          sizes="(min-width: 1024px) 60rem, 100vw"
        />
      </div>
    </div>
  );
}
