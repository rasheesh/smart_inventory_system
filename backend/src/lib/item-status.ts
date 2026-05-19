/**
 * Item status values — kept as plain string literals so this module works
 * independently of the Prisma generated client (which requires `prisma generate`
 * to be re-run after schema changes before new enum values are available).
 *
 * These strings match the PostgreSQL ItemStatus enum values exactly.
 */
export const ItemStatusValue = {
  normal: 'normal',
  low_stock: 'low_stock',
  out_of_stock: 'out_of_stock',
  expiring: 'expiring',
  expired: 'expired',
} as const

export type ItemStatusValue = (typeof ItemStatusValue)[keyof typeof ItemStatusValue]

/**
 * Compute the correct item status based on quantity, reorder level, and expiry date.
 *
 * Rules (evaluated in priority order):
 *
 * 1. EXPIRING SOON — expiryDate is within 3 days from now
 *    → 'expiring'  (RED, overrides everything)
 *
 * 2. EXPIRED — expiryDate is in the past
 *    → 'expired'  (RED)
 *
 * 3. NO STOCK — quantity === 0
 *    → 'out_of_stock'  (RED)
 *
 * 4. LOW STOCK — quantity > 0 AND quantity <= reorderLevel
 *    → 'low_stock'  (ORANGE)
 *
 * 5. SUFFICIENT STOCK — quantity > reorderLevel
 *    → 'normal'  (GREEN)
 */
export function computeItemStatus(
  quantity: number,
  reorderLevel: number,
  expiryDate: Date,
): ItemStatusValue {
  const now = new Date()
  const msPerDay = 1000 * 60 * 60 * 24
  const daysUntilExpiry = (expiryDate.getTime() - now.getTime()) / msPerDay

  // 1. Expiring within 3 days — overrides everything
  if (daysUntilExpiry >= 0 && daysUntilExpiry <= 3) {
    return ItemStatusValue.expiring
  }

  // 2. Already expired
  if (daysUntilExpiry < 0) {
    return ItemStatusValue.expired
  }

  // 3. No stock
  if (quantity === 0) {
    return ItemStatusValue.out_of_stock
  }

  // 4. Low stock
  if (quantity <= reorderLevel) {
    return ItemStatusValue.low_stock
  }

  // 5. Sufficient stock
  return ItemStatusValue.normal
}
