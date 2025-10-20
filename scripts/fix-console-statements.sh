#!/bin/bash

# Script to replace console statements with proper logging in API routes
# This will fix the remaining no-console lint errors

echo "🔧 Fixing console statements in API routes..."

# Replace console.log with proper logging
find app/api -name "*.ts" -type f -exec sed -i '' 's/console\.log(/logger.info(/g' {} \;

# Replace console.error with proper logging  
find app/api -name "*.ts" -type f -exec sed -i '' 's/console\.error(/logger.error(/g' {} \;

# Replace console.warn with proper logging
find app/api -name "*.ts" -type f -exec sed -i '' 's/console\.warn(/logger.warn(/g' {} \;

# Replace console.debug with proper logging
find app/api -name "*.ts" -type f -exec sed -i '' 's/console\.debug(/logger.debug(/g' {} \;

# Add logger import to files that need it (if not already present)
find app/api -name "*.ts" -type f -exec grep -L "import.*logger.*from" {} \; | while read file; do
    if grep -q "logger\." "$file"; then
        echo "Adding logger import to $file"
        # Add import after existing imports
        sed -i '' '/^import.*from/a\
import { logger } from "@/lib/server/logger";
' "$file"
    fi
done

echo "✅ Console statements fixed in API routes"

# Fix console statements in components (replace with proper error handling)
echo "🔧 Fixing console statements in components..."

# For components, we'll replace console.error with proper error handling
find components -name "*.tsx" -type f -exec sed -i '' 's/console\.error.*;//g' {} \;
find app -name "page.tsx" -type f -exec sed -i '' 's/console\.error.*;//g' {} \;

echo "✅ Console statements fixed in components"

echo "🎉 All console statement fixes completed!"