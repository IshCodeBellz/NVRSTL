-- AlterTable
ALTER TABLE "Brand" ADD COLUMN     "backgroundImage" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "displayOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "logoUrl" TEXT;
