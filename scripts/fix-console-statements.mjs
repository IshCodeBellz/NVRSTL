#!/usr/bin/env node

import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

// Get all files with console statements
const command = `npx eslint app/ --format=json | grep -v "^$"`;

try {
  const output = execSync(command, { encoding: "utf-8" });
  const results = JSON.parse(output);

  const consoleFixes = new Map();

  for (const result of results) {
    const filePath = result.filePath;

    for (const message of result.messages) {
      if (message.ruleId === "no-console") {
        if (!consoleFixes.has(filePath)) {
          consoleFixes.set(filePath, []);
        }
        consoleFixes.get(filePath).push({
          line: message.line,
          column: message.column,
          message: message.message,
        });
      }
    }
  }

  // Fix each file
  for (const [filePath, issues] of consoleFixes) {
    try {
      let content = readFileSync(filePath, "utf-8");
      const lines = content.split("\n");

      // Add logger import if not present
      if (
        !content.includes("import { error as logError }") &&
        !content.includes('from "@/lib/server/logger"')
      ) {
        // Find the last import line
        let lastImportIndex = -1;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim().startsWith("import ")) {
            lastImportIndex = i;
          }
        }

        if (lastImportIndex >= 0) {
          lines.splice(
            lastImportIndex + 1,
            0,
            'import { error as logError } from "@/lib/server/logger";'
          );
        }
      }

      // Fix console statements
      for (const issue of issues.reverse()) {
        // Reverse to maintain line numbers
        const lineIndex = issue.line - 1;
        const line = lines[lineIndex];

        if (line.includes("console.error")) {
          lines[lineIndex] = line
            .replace(
              /console\.error\s*\(\s*"([^"]*)",\s*([^)]*)\)/,
              'logError("$1", $2 as Error)'
            )
            .replace(
              /console\.error\s*\(\s*'([^']*)',\s*([^)]*)\)/,
              'logError("$1", $2 as Error)'
            );
        } else if (line.includes("console.warn")) {
          lines[lineIndex] = line
            .replace(
              /console\.warn\s*\(\s*"([^"]*)",\s*([^)]*)\)/,
              'logError("$1", $2 as Error)'
            )
            .replace(
              /console\.warn\s*\(\s*'([^']*)',\s*([^)]*)\)/,
              'logError("$1", $2 as Error)'
            );
        } else if (line.includes("console.log")) {
          // Remove or comment out console.log statements
          lines[lineIndex] = line.replace(
            /console\.log.*?;/,
            "// Debug log removed"
          );
        }
      }

      const fixedContent = lines.join("\n");
      writeFileSync(filePath, fixedContent);
      console.log(`Fixed ${issues.length} console issues in ${filePath}`);
    } catch (error) {
      console.error(`Error fixing ${filePath}:`, error.message);
    }
  }

  console.log(`\nFixed console statements in ${consoleFixes.size} files`);
} catch (error) {
  console.error("Error running fix script:", error.message);
}
