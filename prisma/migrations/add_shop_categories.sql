-- Create Shop Category tables for managing shop categories, leagues, and teams

-- Shop Categories (e.g., Football, Basketball, etc.)
CREATE TABLE "ShopCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopCategory_pkey" PRIMARY KEY ("id")
);

-- Shop Subcategories/Leagues (e.g., Premier League, La Liga, etc.)
CREATE TABLE "ShopSubcategory" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopSubcategory_pkey" PRIMARY KEY ("id")
);

-- Shop Teams (e.g., Arsenal, Chelsea, etc.)
CREATE TABLE "ShopTeam" (
    "id" TEXT NOT NULL,
    "subcategoryId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopTeam_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE UNIQUE INDEX "ShopCategory_slug_key" ON "ShopCategory"("slug");
CREATE UNIQUE INDEX "ShopSubcategory_categoryId_slug_key" ON "ShopSubcategory"("categoryId", "slug");
CREATE UNIQUE INDEX "ShopTeam_subcategoryId_slug_key" ON "ShopTeam"("subcategoryId", "slug");

-- Add foreign key constraints
ALTER TABLE "ShopSubcategory" ADD CONSTRAINT "ShopSubcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ShopCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShopTeam" ADD CONSTRAINT "ShopTeam_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "ShopSubcategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
