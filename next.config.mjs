/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Keep the current deployment model (static files served by Nginx).
  // This matches the existing SPA behavior and avoids SSR friction.
  output: 'export',

  // For a smooth transition, keep images unoptimized in static export.
  images: { unoptimized: true },

  // During migration, avoid ESLint config differences blocking builds.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
