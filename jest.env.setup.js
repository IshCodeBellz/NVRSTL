// jest.env.setup.js
// Try to load .env.local first, then fallback to .env
require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: ".env" });

// In CI, ensure we use the environment variable if it's set
if (process.env.CI && process.env.DATABASE_URL) {
  console.log("CI environment detected, using DATABASE_URL from environment");
}

// Only log once to avoid cluttering test output
if (!global._jestEnvLogged) {
  global._jestEnvLogged = true;
  // Optionally log for debug (mask credentials):
  const maskedUrl =
    process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ":***@") || "not set";
  console.log("Jest environment setup:");
  console.log("  DATABASE_URL:", maskedUrl);
  console.log("  NODE_ENV:", process.env.NODE_ENV);
  console.log("  CI:", process.env.CI || "false");
}
