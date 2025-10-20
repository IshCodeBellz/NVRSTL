#!/usr/bin/env tsx
/*
  Scans all Markdown files in the repo for unresolved placeholders and demo/local URLs.
  Prints a grouped report with file path, line, and the matched token snippet.
*/
import { glob } from "glob";
import fs from "fs";
import path from "path";

type Finding = { file: string; line: number; match: string; context: string };

const PATTERNS: { label: string; regex: RegExp }[] = [
  {
    label: "domain-placeholder",
    regex: /your[-_. ]?domain\.com|<your-domain>|your-app\.vercel\.app/gi,
  },
  {
    label: "generic-placeholder",
    regex: /REPLACE|PLACEHOLDER|CHANGEME|FILL_ME|YOUR_[A-Z0-9_\-]+/g,
  },
  { label: "example-email", regex: /[A-Za-z0-9_.+-]+@example\.com/gi },
  { label: "localhost-url", regex: /http:\/\/localhost:\d{2,5}[^\s)\]]*/gi },
  { label: "template-vars", regex: /\{\{[^}]+\}\}/g },
  {
    label: "cron-secret",
    regex: /YOUR_CRON_SECRET|CRON_SECRET(?![A-Za-z0-9_])/g,
  },
  {
    label: "stripe-webhook-placeholder",
    regex: /whsec_[a-zA-Z0-9_-]*your[_-]?webhook[_-]?secret/gi,
  },
  {
    label: "resend-placeholder",
    regex: /your[-_ ]?resend[-_ ]?api[-_ ]?key|RESEND_API_KEY=your/gi,
  },
  {
    label: "sentry-placeholder",
    regex: /SENTRY_DSN=.*your|your[-_ ]?sentry[-_ ]?dsn/gi,
  },
  {
    label: "email-from-generic",
    regex: /EMAIL_FROM=.*yourdomain\.com|no-reply@yourdomain\.com/gi,
  },
  {
    label: "apple-pay-file-note",
    regex: /apple-developer-merchantid-domain-association.*replace/i,
  },
];

function scanFile(file: string): Finding[] {
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);
  const findings: Finding[] = [];

  lines.forEach((lineText, idx) => {
    for (const { label, regex } of PATTERNS) {
      regex.lastIndex = 0; // reset
      const m = lineText.match(regex);
      if (m) {
        findings.push({
          file,
          line: idx + 1,
          match: `${label}: ${m.join(" | ")}`,
          context: lineText.trim().slice(0, 200),
        });
      }
    }
  });
  return findings;
}

async function main() {
  const cwd = process.cwd();
  const mdPaths = await glob("**/*.md", {
    cwd,
    ignore: [
      "**/node_modules/**",
      "**/.next/**",
      "**/coverage/**",
      "**/README.md.d.ts",
    ],
  });

  const allFindings: Finding[] = [];
  for (const rel of mdPaths) {
    const file = path.resolve(cwd, rel);
    try {
      allFindings.push(...scanFile(file));
    } catch (e) {
      // ignore read errors
    }
  }

  if (allFindings.length === 0) {
    console.log("No unresolved placeholders detected in Markdown files. ✅");
    process.exit(0);
  }

  // Group by file
  const byFile = allFindings.reduce<Record<string, Finding[]>>((acc, f) => {
    (acc[f.file] ||= []).push(f);
    return acc;
  }, {});

  let total = 0;
  for (const [file, items] of Object.entries(byFile)) {
    console.log(`\n# ${path.relative(cwd, file)}`);
    for (const it of items) {
      total++;
      console.log(`- L${it.line}: ${it.match}`);
      console.log(`  > ${it.context}`);
    }
  }
  console.log(
    `\nFound ${total} potential placeholders across ${
      Object.keys(byFile).length
    } files.`
  );
  process.exitCode = 1; // non-zero to signal attention required in CI
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
