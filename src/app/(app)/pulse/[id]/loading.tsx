/**
 * Route-level loading UI for the pulse detail page. Next renders this instantly
 * when navigating to /pulse/[id] (via Suspense) — before the heavy client chunk
 * loads — so the click gives immediate feedback instead of a frozen ~5s gap.
 *
 * A lightweight skeleton that mirrors the real layout (header, vitals strip,
 * tab card) reads as "the page is loading" rather than a bare spinner.
 */
export default function PulseLoading() {
  return (
    <div className="min-h-screen p-0 md:p-6 space-y-4 md:space-y-5 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-48 rounded bg-gray-800" />
          <div className="h-3 w-32 rounded bg-gray-800/70" />
        </div>
        <div className="h-8 w-24 rounded bg-gray-800" />
      </div>

      {/* Vitals strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-lg bg-gray-800/60 border border-gray-800" />
        ))}
      </div>

      {/* Tab card */}
      <div className="bg-dark border border-gray-800 rounded-lg overflow-hidden">
        <div className="flex items-center gap-4 border-b border-gray-800/70 px-3 py-3">
          <div className="h-4 w-24 rounded bg-gray-800" />
          <div className="h-4 w-20 rounded bg-gray-800/70" />
          <div className="h-4 w-20 rounded bg-gray-800/70" />
        </div>
        <div className="p-4 md:p-5 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-gray-800/60" />
            ))}
          </div>
          <div className="h-[260px] md:h-[300px] rounded-lg bg-gray-800/40 border border-gray-800" />
        </div>
      </div>
    </div>
  );
}
