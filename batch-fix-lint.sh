#!/bin/bash

# Fix common patterns in multiple files
echo "Applying batch lint fixes..."

# Replace unused 'e' variables with 'error'
find app -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/} catch (e) {/} catch (error) {/g'
find app -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/} catch (err) {/} catch (error) {/g'

# Replace console.error with unused variables
find app -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/console\.error(".*", e);/console.error("Error:", error);/g'

# Remove unused imports (common ones)
find app -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/import.*useCallback.*from "react";//g'
find app -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/import.*formatPriceCents.*from.*;//g'

echo "Batch fixes applied. Run npm run lint to see remaining issues."
