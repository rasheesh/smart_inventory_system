import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const items = await prisma.inventoryItem.findMany({
    select: { id: true, name: true, quantity: true, reorderLevel: true, status: true },
    take: 10,
    orderBy: { name: 'asc' },
  })
  console.log(JSON.stringify(items, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
