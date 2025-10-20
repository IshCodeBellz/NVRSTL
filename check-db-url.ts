#!/usr/bin/env ts-node

// This script shows which DATABASE_URL will be used
import { config } from "dotenv";
import path from "path";

// Load .env.local first
config({ path: path.resolve(process.cwd(), ".env.local") });
console.log("DATABASE_URL from .env.local:", process.env.DATABASE_URL);

// Load .env (this won't override existing values)
config({ path: path.resolve(process.cwd(), ".env") });
console.log("Final DATABASE_URL:", process.env.DATABASE_URL);

// Show which database this connects to
const dbUrl = process.env.DATABASE_URL || "";
if (dbUrl.includes("localhost")) {
  console.log("✅ Will connect to LOCAL database");
} else if (dbUrl.includes("railway") || dbUrl.includes("rlwy.net")) {
  console.log("🚨 Will connect to PRODUCTION database");
} else {
  console.log("❓ Unknown database type");
}
