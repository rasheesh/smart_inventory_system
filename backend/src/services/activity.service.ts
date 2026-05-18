import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'

export interface LogActivityInput {
  userId: string
  action: string
  item?: string | null
  branch: string
  details?: string | null
}

/** Persist an audit log entry. Pass `tx` when called inside a Prisma transaction. */
export async function logActivity(input: LogActivityInput, tx?: Prisma.TransactionClient) {
  const client = tx ?? prisma
  return client.activity.create({
    data: {
      userId: input.userId,
      action: input.action,
      item: input.item ?? null,
      branch: input.branch,
      details: input.details ?? null,
    },
  })
}

export function describeChangedFields(
  data: Record<string, unknown>,
  redactKeys: string[] = ['password', 'passwordHash'],
): string {
  const fields = Object.keys(data).filter((key) => data[key] !== undefined)
  if (fields.length === 0) return 'No fields changed'
  return fields
    .map((key) => (redactKeys.includes(key) ? `${key} (updated)` : key))
    .join(', ')
}

export interface ActivityFilters {
  searchUser?: string
  action?: string
  branch?: string
  searchItem?: string
  dateFrom?: string
  dateTo?: string
}

function buildActivityWhere(filters: ActivityFilters): Prisma.ActivityWhereInput {
  const where: Prisma.ActivityWhereInput = {}

  if (filters.searchUser) {
    where.user = { name: { contains: filters.searchUser, mode: 'insensitive' } }
  }
  if (filters.action && filters.action !== 'all') {
    where.action = filters.action
  }
  if (filters.branch && filters.branch !== 'all') {
    where.branch = { equals: filters.branch, mode: 'insensitive' }
  }
  if (filters.searchItem) {
    where.OR = [
      { item: { contains: filters.searchItem, mode: 'insensitive' } },
      { details: { contains: filters.searchItem, mode: 'insensitive' } },
    ]
  }
  if (filters.dateFrom || filters.dateTo) {
    where.timestamp = {}
    if (filters.dateFrom) {
      where.timestamp.gte = new Date(`${filters.dateFrom}T00:00:00`)
    }
    if (filters.dateTo) {
      where.timestamp.lte = new Date(`${filters.dateTo}T23:59:59.999`)
    }
  }

  return where
}

export async function getActivities(filters: ActivityFilters) {
  return prisma.activity.findMany({
    where: buildActivityWhere(filters),
    include: { user: { select: { name: true } } },
    orderBy: { timestamp: 'desc' },
  })
}

export async function getActivityStats() {
  const now = new Date()
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [last24Hours, lastWeekCount, activeUsersResult] = await Promise.all([
    prisma.activity.count({ where: { timestamp: { gte: last24h } } }),
    prisma.activity.count({ where: { timestamp: { gte: lastWeek } } }),
    prisma.activity.groupBy({ by: ['userId'], _count: { userId: true } }),
  ])

  return {
    last24Hours,
    lastWeek: lastWeekCount,
    activeUsers: activeUsersResult.length,
  }
}
