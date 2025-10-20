-- Guarded alteration: On fresh databases where the base schema hasn't created
-- the "OrderItem" table yet, this migration should be a no-op to allow later
-- migrations (including init) to run. For existing databases that already have
-- "OrderItem", add the columns if they're missing.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'OrderItem'
  ) THEN
    ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "customKey" TEXT;
    ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "customizations" TEXT;
  END IF;
END $$;
