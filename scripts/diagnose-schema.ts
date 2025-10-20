#!/usr/bin/env ts-node
/**
 * Schema drift diagnostic.
 * Compares columns defined in prisma/schema.prisma for selected models
 * with actual columns present in the connected DATABASE_URL.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... npx ts-node scripts/diagnose-schema.ts
 * or via npm script (added separately):
 *   npm run diagnose:schema
 *
 * To check production:
 *   export DATABASE_URL="<railway_url>" && npm run diagnose:schema
 */
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Models we care most about for auth & registration right now.
const TARGET_MODELS = ["User", "EmailVerificationToken"];

interface ModelSpec {
  name: string;
  columns: Set<string>;
}

function parsePrismaSchema(filePath: string): ModelSpec[] {
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);
  const specs: ModelSpec[] = [];
  let current: ModelSpec | null = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("model ")) {
      const name = trimmed.split(/\s+/)[1];
      if (TARGET_MODELS.includes(name)) {
        current = { name, columns: new Set() }; // columns will be filled
      } else {
        current = null;
      }
      continue;
    }
    if (current) {
      if (trimmed.startsWith("}")) {
        specs.push(current);
        current = null;
        continue;
      }
      if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("@"))
        continue;
      if (trimmed.startsWith("@@")) continue; // block attribute
      // Field line: first token is field name unless it's a relation we still store
      const firstToken = trimmed.split(/\s+/)[0];
      // Skip obvious relation-only virtual fields (array or referencing other models) that do not create columns.
      // Heuristic: if line contains '[' or '[]' after the type token with no @map etc, skip if it ends with '[]'.
      // We'll still include scalar + optional scalars.
      // Determine type token
      const tokens = trimmed.split(/\s+/);
      if (tokens.length < 2) continue;
      const typeToken = tokens[1];
      const isRelationArray = /\[\]$/.test(typeToken);
      if (isRelationArray) continue;
      // Exclude lines that contain '@relation(' because those are foreign key virtual sides without own column (fields defined separately)
      if (trimmed.includes("@relation(")) continue;
      // Exclude lines that look like back-relations with array or optional and NO primitive scalar
      // Keep scalar + optional (String, Int, DateTime, Boolean, etc.)
      current.columns.add(firstToken);
    }
  }
  return specs;
}

async function fetchDbColumns(model: string): Promise<Set<string>> {
  // Postgres stores case-sensitive quoted identifiers exactly; Prisma uses quoted PascalCase for models like User.
  const rows: Array<{ column_name: string }> = await prisma.$queryRawUnsafe(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
    model
  );
  return new Set(rows.map((r) => r.column_name));
}

async function main() {
  const schemaPath = path.resolve(process.cwd(), "prisma", "schema.prisma");
  const specs = parsePrismaSchema(schemaPath);

  interface SchemaReport {
    model: string;
    expectedCount: number;
    dbCount: number;
    missing: string[];
    extra: string[];
  }

  const report: SchemaReport[] = [];
  for (const spec of specs) {
    const dbCols = await fetchDbColumns(spec.name);
    // Filter expected columns to likely real columns (remove relation-only heuristic: those starting lowercase but not present maybe)
    // Compute missing & extra
    const missing = [...spec.columns].filter((c) => !dbCols.has(c));
    const extra = [...dbCols].filter((c) => !spec.columns.has(c) && c !== "id");
    report.push({
      model: spec.name,
      expectedCount: spec.columns.size,
      dbCount: dbCols.size,
      missing,
      extra,
    });
  }
  const drift = report.filter((r) => r.missing.length || r.extra.length);
  const summary = {
    databaseUrl: process.env.DATABASE_URL,
    driftDetected: drift.length > 0,
    report,
  };
  console.log(JSON.stringify(summary, null, 2));
  if (drift.length) {
    console.error(
      "\n[SCHEMA DRIFT] Differences detected. If this is production, run: npx prisma migrate deploy"
    );
    process.exitCode = 2;
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("[diagnose-schema:error]", e);
  process.exit(1);
});
