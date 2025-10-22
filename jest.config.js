const nextJest = require("next/jest");

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: "./",
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jest-environment-jsdom",
  testMatch: [
    "**/__tests__/**/*.(js|jsx|ts|tsx)",
    "**/*.(test|spec).(js|jsx|ts|tsx)",
  ],
  testPathIgnorePatterns: [
    "<rootDir>/.next/",
    "<rootDir>/node_modules/",
    "<rootDir>/out/",
    "<rootDir>/build/",
    "<rootDir>/dist/",
  ],
  collectCoverageFrom: [
    "app/**/*.{js,jsx,ts,tsx}",
    "components/**/*.{js,jsx,ts,tsx}",
    "lib/**/*.{js,jsx,ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!**/.next/**",
    "!**/coverage/**",
    "!**/*.config.js",
    "!**/jest.setup.js",
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": ["babel-jest", { presets: ["next/babel"] }],
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(jose|openid-client|next-auth|@sentry|@next-auth|@auth|@auth0|@auth0/nextjs-auth0|@vercel/blob|@vercel/postgres|@vercel/edge-config|@vercel/analytics|@vercel/speed-insights|@vercel/web-vitals|@vercel/og|@vercel/kv|@vercel/storage|@vercel/functions|@vercel/edge|@vercel/static|@vercel/build|@vercel/deployment|@vercel/env|@vercel/types|@vercel/utils|@vercel/webpack|@vercel/next|@vercel/react|@vercel/svelte|@vercel/vue|@vercel/angular|@vercel/remix|@vercel/nuxt|@vercel/astro|@vercel/solid|@vercel/qwik|@vercel/sveltekit|@vercel/hydrogen|@vercel/shopify|@vercel/wordpress|@vercel/drupal|@vercel/contentful|@vercel/sanity|@vercel/strapi|@vercel/ghost|@vercel/medium|@vercel/devto|@vercel/hashnode|@vercel/substack|@vercel/beehiiv|@vercel/convertkit|@vercel/mailchimp|@vercel/sendgrid|@vercel/resend|@vercel/postmark|@vercel/mailgun|@vercel/ses|@vercel/twilio|@vercel/plivo|@vercel/vonage|@vercel/messagebird|@vercel/bandwidth|@vercel/telnyx|@vercel/signalwire|@vercel/agora|@vercel/daily|@vercel/zoom|@vercel/teams|@vercel/slack|@vercel/discord|@vercel/telegram|@vercel/whatsapp|@vercel/facebook|@vercel/instagram|@vercel/twitter|@vercel/linkedin|@vercel/youtube|@vercel/tiktok|@vercel/snapchat|@vercel/pinterest|@vercel/reddit|@vercel/github|@vercel/gitlab|@vercel/bitbucket|@vercel/azure|@vercel/aws|@vercel/gcp|@vercel/cloudflare|@vercel/netlify|@vercel/heroku|@vercel/railway|@vercel/render|@vercel/fly|@vercel/digitalocean|@vercel/linode|@vercel/vultr|@vercel/scaleway|@vercel/ovh|@vercel/hetzner|@vercel/contabo|@vercel/ionos|@vercel/hostinger|@vercel/namecheap|@vercel/godaddy|@vercel/cloudways|@vercel/siteground|@vercel/a2hosting|@vercel/hostgator|@vercel/bluehost|@vercel/inmotion|@vercel/dreamhost|@vercel/greengeeks|@vercel/wpengine|@vercel/kinsta|@vercel/pantheon|@vercel/acquia|@vercel/platformsh|@vercel/heroku|@vercel/railway|@vercel/render|@vercel/fly|@vercel/digitalocean|@vercel/linode|@vercel/vultr|@vercel/scaleway|@vercel/ovh|@vercel/hetzner|@vercel/contabo|@vercel/ionos|@vercel/hostinger|@vercel/namecheap|@vercel/godaddy|@vercel/cloudways|@vercel/siteground|@vercel/a2hosting|@vercel/hostgator|@vercel/bluehost|@vercel/inmotion|@vercel/dreamhost|@vercel/greengeeks|@vercel/wpengine|@vercel/kinsta|@vercel/pantheon|@vercel/acquia|@vercel/platformsh)/)",
    "^.+\\.module\\.(css|sass|scss)$",
  ],
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  globals: {
    "ts-jest": {
      useESM: true,
    },
  },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
