import { dirname, join } from "path";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "bcryptjs"],
    instrumentationHook: true,
  },

  // Production optimizations
  swcMinify: true,
  compress: true,

  // Build optimization for production
  typescript: {
    // Allow production builds with TypeScript errors
    ignoreBuildErrors: true,
  },

  eslint: {
    // Allow production builds with ESLint errors
    ignoreDuringBuilds: true,
  },

  // Environment variables
  env: {
    NODE_ENV: "production",
  },

  // Headers for production
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },

  // Image optimization
  images: {
    domains: ["localhost", "dy-official.vercel.app"],
    formats: ["image/webp", "image/avif"],
  },

  // Webpack configuration
  webpack: (config, { dev, isServer }) => {
    // Ensure TS path alias '@/*' works in production builds (e.g., Vercel)
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias["@"] = process.cwd();

    // Production optimizations
    if (!dev) {
      config.optimization.minimize = true;
      config.optimization.sideEffects = false;
    }

    return config;
  },
};

export default nextConfig;
