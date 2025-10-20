#!/usr/bin/env ts-node

/**
 * Script to automatically fix ESLint errors in the codebase
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

console.log("🔧 Fixing ESLint errors automatically...\n");

// Define files and their fixes
const fixes = [
  // Fix HTML link for pages error
  {
    file: "app/admin/notifications/page.tsx",
    oldString: `<a href="/admin/shipping/" className="text-blue-600 hover:underline">`,
    newString: `<Link href="/admin/shipping/" className="text-blue-600 hover:underline">`,
  },

  // Fix unused imports
  {
    file: "app/api/admin/monitoring/shipping/route.ts",
    oldString: `import { NextRequest } from 'next/server';`,
    newString: `// NextRequest import removed - not used`,
  },

  // Fix unused variable in health check
  {
    file: "app/api/health/database/route.ts",
    oldString: `    const writeTest = await prisma.user.count();`,
    newString: `    await prisma.user.count(); // Write test`,
  },

  // Fix let to const
  {
    file: "app/api/admin/shipping/route.ts",
    oldString: `    let whereClause: any = {};`,
    newString: `    const whereClause: any = {};`,
  },
];

// Apply fixes
for (const fix of fixes) {
  const filePath = path.join(process.cwd(), fix.file);

  if (fs.existsSync(filePath)) {
    try {
      let content = fs.readFileSync(filePath, "utf8");

      if (content.includes(fix.oldString)) {
        content = content.replace(fix.oldString, fix.newString);
        fs.writeFileSync(filePath, content);
        console.log(`✅ Fixed: ${fix.file}`);
      }
    } catch (error) {
      console.log(`❌ Error fixing ${fix.file}:`, error);
    }
  }
}

// Run ESLint with --fix to auto-fix what it can
console.log("\n🔧 Running ESLint --fix...");
try {
  execSync("npm run lint -- --fix", { stdio: "inherit" });
  console.log("✅ ESLint auto-fix completed");
} catch (error) {
  console.log("⚠️  ESLint fix completed with some remaining issues");
}

console.log("\n🎯 Lint error fixes completed!");
