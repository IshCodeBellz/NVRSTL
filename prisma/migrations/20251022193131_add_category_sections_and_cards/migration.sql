-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "productType" TEXT;

-- CreateTable
CREATE TABLE "CategorySection" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategorySection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryCard" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "imageUrl" TEXT,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CategorySection_title_key" ON "CategorySection"("title");

-- CreateIndex
CREATE UNIQUE INDEX "CategorySection_slug_key" ON "CategorySection"("slug");

-- CreateIndex
CREATE INDEX "CategorySection_displayOrder_idx" ON "CategorySection"("displayOrder");

-- CreateIndex
CREATE INDEX "CategorySection_isActive_idx" ON "CategorySection"("isActive");

-- CreateIndex
CREATE INDEX "CategoryCard_sectionId_idx" ON "CategoryCard"("sectionId");

-- CreateIndex
CREATE INDEX "CategoryCard_displayOrder_idx" ON "CategoryCard"("displayOrder");

-- CreateIndex
CREATE INDEX "CategoryCard_isActive_idx" ON "CategoryCard"("isActive");

-- AddForeignKey
ALTER TABLE "CategoryCard" ADD CONSTRAINT "CategoryCard_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "CategorySection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
