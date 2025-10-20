-- Ensure OrderItem has customization columns after base schema is applied
-- This migration is safe for both fresh and existing databases.
ALTER TABLE "OrderItem"
  ADD COLUMN IF NOT EXISTS "customKey" TEXT,
  ADD COLUMN IF NOT EXISTS "customizations" TEXT;
