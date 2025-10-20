-- Add support for subcategories
ALTER TABLE "Category" 
ADD COLUMN "parentId" TEXT,
ADD COLUMN "description" TEXT,
ADD COLUMN "imageUrl" TEXT,
ADD COLUMN "displayOrder" INTEGER DEFAULT 0,
ADD COLUMN "isActive" BOOLEAN DEFAULT true;

-- Add foreign key constraint for parent category
ALTER TABLE "Category" 
ADD CONSTRAINT "Category_parentId_fkey" 
FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create index for parent lookup
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");