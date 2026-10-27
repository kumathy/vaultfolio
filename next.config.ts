import type { NextConfig } from "next";

const securityHeaders = [
  // frame-ancestors + X-Frame-Options prevent clickjacking.
  {
    key: "Content-Security-Policy",
    value:
      "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
  },
  { key: "X-Frame-Options", value: "DENY" },
  // Keeps OAuth codes in callback URLs out of Referer headers sent to other sites.
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const noStore = [{ key: "Cache-Control", value: "private, no-store" }];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/accounts", headers: noStore },
      { source: "/oauth/:path*", headers: noStore },
    ];
  },
};

export default nextConfig;
