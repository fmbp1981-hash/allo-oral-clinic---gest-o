/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Enable API Routes for Vercel serverless functions
  // Removed 'output: export' to allow server-side features

  // For a smooth transition, keep images unoptimized.
  images: { unoptimized: true },

  // During migration, avoid ESLint config differences blocking builds.
  eslint: { ignoreDuringBuilds: true },
  
  // Ignore TypeScript errors during build (migration in progress)
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
