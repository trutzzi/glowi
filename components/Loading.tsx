import { LOGO_MONOGRAM, LOGO_PETALS } from "@/components/Logo";

// Suspense fallback: the logo's lotus draws itself petal by petal over a soft
// glow, in the salon's accent colour. Pure CSS (see "Loading" in globals.css),
// so it works in server components and costs no JavaScript. It fades in after a
// short delay, so pages that load quickly don't flash it.
export function Loading({ label = "Se încarcă…", size = "md" }: { label?: string; size?: "sm" | "md" }) {
  const small = size === "sm";
  return (
    <div role="status" aria-live="polite" className={`loader flex items-center ${small ? "gap-3 py-2" : "flex-col justify-center gap-4 py-16"}`}>
      <div className={`relative ${small ? "h-8 w-8" : "h-20 w-20"}`}>
        <span aria-hidden className="loader-glow absolute inset-0 rounded-full bg-primary-soft" />
        <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" className="relative h-full w-full text-primary" aria-hidden>
          {LOGO_PETALS.map((d, i) => (
            <path key={d} d={d} pathLength={1} className="loader-stroke" style={{ animationDelay: `${i * 0.12}s` }} />
          ))}
          <path d={LOGO_MONOGRAM} pathLength={1} className="loader-stroke" style={{ animationDelay: `${LOGO_PETALS.length * 0.12}s` }} />
        </svg>
      </div>
      <p className={small ? "text-sm text-gray-500" : "font-display text-lg text-gray-600 italic"}>{label}</p>
    </div>
  );
}
