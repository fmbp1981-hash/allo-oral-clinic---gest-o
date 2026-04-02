/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Enable API Routes for Vercel serverless functions
  // Removed 'output: export' to allow server-side features

  // Optimize images via Next.js Image component
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
    ],
  },

  // ESLint runs separately in CI — skip during build to avoid OOM on constrained machines
  eslint: { ignoreDuringBuilds: true },

  // Enable TypeScript checking during builds
  typescript: { ignoreBuildErrors: false },

  // Mark optional SDKs as server-external so webpack doesn't warn about them
  serverExternalPackages: ['@anthropic-ai/sdk'],
};

export default nextConfig;
