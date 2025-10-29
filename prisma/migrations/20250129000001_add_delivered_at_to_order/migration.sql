-- Add deliveredAt field to Order table
-- This field tracks when an order is marked as DELIVERED
-- Safe migration: only adds column if table exists and column doesn't already exist

DO $$
BEGIN
  -- Check if Order table exists and column doesn't exist yet
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Order'
  ) THEN
    -- Add column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = 'Order' 
        AND column_name = 'deliveredAt'
    ) THEN
      ALTER TABLE "Order" ADD COLUMN "deliveredAt" TIMESTAMP(3);
    END IF;
  END IF;
END $$;

