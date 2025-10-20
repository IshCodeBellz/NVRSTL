/*
  Warnings:

  - You are about to drop the column `mfaBackupCodes` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `mfaSecret` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "mfaBackupCodes",
DROP COLUMN "mfaSecret";
