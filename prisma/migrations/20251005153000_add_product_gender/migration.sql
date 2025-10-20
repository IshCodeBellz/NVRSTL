-- Add optional gender column to Product for gender-based filtering
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "gender" TEXT;
CREATE INDEX IF NOT EXISTS "Product_gender_idx" ON "Product" ("gender");
