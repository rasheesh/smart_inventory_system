/**
 * One-time backfill script — recomputes and saves the correct status
 * for every InventoryItem in the database.
 *
 * Run with:
 *   npx ts-node prisma/backfill-status.ts
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Status logic inlined to avoid module resolution issues when running directly
function computeStatus(quantity: number, reorderLevel: number, expiryDate: Date): string {
  const now = new Date()
  const msPerDay = 1000 * 60 * 60 * 24
  const daysUntilExpiry = (expiryDate.getTime() - now.getTime()) / msPerDay

  if (daysUntilExpiry >= 0 && daysUntilExpiry <= 3) return 'expiring'
  if (daysUntilExpiry < 0) return 'expired'
  if (quantity === 0) return 'out_of_stock'
  if (quantity <= reorderLevel) return 'low_stock'
  return 'normal'
}

async function main() {
  const items = await prisma.inventoryItem.findMany()
  console.log(`Found ${items.length} items to backfill.`)

  let updated = 0
  for (const item of items) {
    const correctStatus = computeStatus(item.quantity, item.reorderLevel, item.expiryDate)

    if ((item.status as string) !== correctStatus) {
      // Use $executeRaw to bypass Prisma enum validation for out_of_stock
      await prisma.$executeRaw`
        UPDATE "InventoryItem"
        SET status = ${correctStatus}::"ItemStatus"
        WHERE id = ${item.id}
      `
      console.log(
        `  Updated "${item.name}" (qty=${item.quantity}, reorder=${item.reorderLevel}): ${item.status} → ${correctStatus}`,
      )
      updated++
    }
  }

  console.log(`\nDone. ${updated} of ${items.length} items updated.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
