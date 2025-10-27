-- Add teamId field to Product table to link products to shop teams
-- Guarded alteration: On fresh databases where the base schema hasn't created
-- the "Product" table yet, this migration should be a no-op to allow later
-- migrations (including init) to run. For existing databases that already have
-- "Product", add the columns if they're missing.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Product'
  ) THEN
    -- Add teamId column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Product' AND column_name = 'teamId'
    ) THEN
      ALTER TABLE "Product" ADD COLUMN "teamId" TEXT;
    END IF;

    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE table_schema = 'public' AND table_name = 'Product' AND constraint_name = 'Product_teamId_fkey'
    ) THEN
      ALTER TABLE "Product" ADD CONSTRAINT "Product_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "ShopTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    -- Add index if it doesn't exist
    IF NOT EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'Product' AND indexname = 'Product_teamId_idx'
    ) THEN
      CREATE INDEX "Product_teamId_idx" ON "Product"("teamId");
    END IF;
  END IF;
END $$;
