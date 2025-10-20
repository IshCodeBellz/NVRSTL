/*
  Warnings:

  - A unique constraint covering the columns `[cartId,productId,variantId,size,customKey]` on the table `CartLine` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."CartLine_cartId_productId_variantId_size_key";

-- AlterTable
ALTER TABLE "CartLine" ADD COLUMN     "customKey" TEXT,
ADD COLUMN     "customizations" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "isJersey" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "jerseyConfig" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "CartLine_cartId_productId_variantId_size_customKey_key" ON "CartLine"("cartId", "productId", "variantId", "size", "customKey");
