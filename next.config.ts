import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Pages are prerendered, so nonces aren't possible; 'unsafe-inline' is the
// documented setup without them (node_modules/next/dist/docs, Content Security
// Policy → "Without Nonces"). Dev needs 'unsafe-eval' for React's debugging.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Self-contained server for the Docker image (.next/standalone/server.js); see Dockerfile.
  output: "standalone",
  /* config options here */
  experimental: {
    // Server Actions accept 1MB by default; service picture uploads need more.
    // Keep in sync with MAX_IMAGE_BYTES in app/actions/services.ts.
    serverActions: { bodySizeLimit: "5mb" },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
    // Uploaded service pictures, served by app/service-images/[id]/[v]/route.ts.
    localPatterns: [{ pathname: "/service-images/**", search: "" }],
  },
  cacheComponents: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Content-Security-Policy", value: csp },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
          // HTTPS only from now on (not in development: it would stick to localhost).
          ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]),
        ],
      },
      {
        // The service worker must never be cached, or users keep an old one.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
