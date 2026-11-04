// Lotus petals around a G monogram; shared with the animated <Loading />.
export const LOGO_PETALS = [
  "M32 6c6 8 6 18 0 26-6-8-6-18 0-26Z",
  "M32 32c-2-10-10-17-20-18 1 10 8 17 20 18Z",
  "M32 32c2-10 10-17 20-18-1 10-8 17-20 18Z",
  "M32 32C24 26 13 26 4 30c8 6 18 7 28 2Z",
  "M32 32c8-6 19-6 28-2-8 6-18 7-28 2Z",
];
export const LOGO_MONOGRAM = "M40 40a10 10 0 1 0 1 9h-8";

export function Logo({ className = "h-16 w-16" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className={className} aria-hidden>
      {LOGO_PETALS.map((d) => (
        <path key={d} d={d} />
      ))}
      <path d={LOGO_MONOGRAM} strokeLinecap="round" />
    </svg>
  );
}
