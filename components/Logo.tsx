export function Logo({ className = "h-16 w-16" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className={className} aria-hidden>
      {/* lotus petals */}
      <path d="M32 6c6 8 6 18 0 26-6-8-6-18 0-26Z" />
      <path d="M32 32c-2-10-10-17-20-18 1 10 8 17 20 18Z" />
      <path d="M32 32c2-10 10-17 20-18-1 10-8 17-20 18Z" />
      <path d="M32 32C24 26 13 26 4 30c8 6 18 7 28 2Z" />
      <path d="M32 32c8-6 19-6 28-2-8 6-18 7-28 2Z" />
      {/* G monogram */}
      <path d="M40 40a10 10 0 1 0 1 9h-8" strokeLinecap="round" />
    </svg>
  );
}
