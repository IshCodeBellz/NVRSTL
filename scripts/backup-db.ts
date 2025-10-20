#!/usr/bin/env ts-node
/*
 Simple backup helper.
 - SQLite: copies prisma/dev.db to backups/dev-<timestamp>.sqlite
 - Postgres: prints pg_dump command template.
*/
import fs from "fs";
import path from "path";

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

const dbUrl = process.env.DATABASE_URL || "";
if (dbUrl.startsWith("file:")) {
  const dbPath = dbUrl.replace("file:", "");
  const abs = path.resolve(process.cwd(), "prisma", dbPath.replace("./", ""));
  if (!fs.existsSync(abs)) {
    console.error("DB file not found", abs);
    process.exit(1);
  }
  const outDir = path.resolve(process.cwd(), "backups");
  ensureDir(outDir);
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const out = path.join(outDir, `sqlite-${ts}.db`);
  fs.copyFileSync(abs, out);
  console.log("SQLite backup written:", out);
} else if (dbUrl.startsWith("postgres")) {
  console.log("Postgres backup template:");
  console.log(
    '  pg_dump "$DATABASE_URL" -Fc -f backups/pg-$(date +%Y%m%d-%H%M%S).dump'
  );
} else {
  console.log("Unknown DATABASE_URL scheme. No action.");
}
