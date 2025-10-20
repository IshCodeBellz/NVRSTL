-- Add description field to Category table if it doesn't exist
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "description" TEXT;