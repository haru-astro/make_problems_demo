-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "excluded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "groupId" TEXT,
ADD COLUMN     "groupOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CardGroup" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardGroup_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CardGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
