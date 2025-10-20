#!/bin/bash

# Fix common lint patterns
cd /Users/ishaqbello/Website/nvrstl

echo "🔧 Fixing common TypeScript lint errors..."

# Fix unused 'e' and 'err' variables in catch blocks
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | grep -v .next | xargs sed -i '' 's/} catch (e) {/} catch (error) {/g'
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | grep -v .next | xargs sed -i '' 's/} catch (err) {/} catch (error) {/g'
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | grep -v .next | xargs sed -i '' 's/catch (e) {/catch (error) {/g'
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | grep -v .next | xargs sed -i '' 's/catch (err) {/catch (error) {/g'

# Add console.error for error variables that are unused
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | grep -v .next | xargs sed -i '' 's/} catch (error) {/} catch (error) {\
      console.error("Error:", error);/g'

echo "✅ Basic fixes applied. Run npm run lint to see remaining issues."