-- Add teamId field to Product table to link products to shop teams
ALTER TABLE "Product" ADD COLUMN "teamId" TEXT;

-- Add foreign key constraint
ALTER TABLE "Product" ADD CONSTRAINT "Product_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "ShopTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index for performance
CREATE INDEX "Product_teamId_idx" ON "Product"("teamId");
