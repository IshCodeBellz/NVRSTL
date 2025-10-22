import path from "path";
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Relax build blockers so we can produce artifacts while fixing lint/type issues
  eslint: {
    // Skip ESLint errors during production builds
    // ignoreDuringBuilds: true,
    ignoreDuringBuilds: false,
  },
  typescript: {
    // Skip TypeScript type errors during production builds
    // ignoreBuildErrors: true,
    ignoreBuildErrors: false,
  },
  // Skip static generation errors and continue with dynamic rendering
  staticPageGenerationTimeout: 120,
  outputFileTracing: true,
  // Don't fail the build on prerender errors - just skip those pages
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
  images: {
    // Disable Next.js Image Optimization so external domains don't need to be whitelisted
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "images.asos-media.com" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "static.nike.com" },
    ],
  },
  webpack: (config) => {
    // Ensure TS path alias '@/*' works in all environments (e.g., Vercel)
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    const projectRoot = process.cwd();
    config.resolve.alias["@"] = projectRoot;
    return config;
  },
};
export default nextConfig;
