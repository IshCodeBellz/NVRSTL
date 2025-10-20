#!/bin/bash

# Fix console.log statements in API routes
find app/api -name "*.ts" -exec sed -i.bak 's/console\.log(/logger.info(/g' {} \;
find app/api -name "*.ts" -exec sed -i.bak 's/console\.error(/logger.error(/g' {} \;
find app/api -name "*.ts" -exec sed -i.bak 's/console\.warn(/logger.warn(/g' {} \;

# Add logger import to files that use it
for file in $(find app/api -name "*.ts" -exec grep -l "logger\." {} \;); do
  if ! grep -q "import.*logger" "$file"; then
    sed -i.bak '1i import { logger } from "@/lib/server/logger";' "$file"
  fi
done

# Clean up backup files
find app/api -name "*.bak" -delete

echo "Console statements fixed in API routes"
