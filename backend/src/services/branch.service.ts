import { prisma } from '../lib/prisma'
import { BranchStatus } from '@prisma/client'
import { describeChangedFields, logActivity } from './activity.service'

export async function getBranches() {
  return prisma.branch.findMany({ orderBy: { name: 'asc' } })
}

export interface CreateBranchData {
  name: string
  address: string
  city: string
  manager: string
  contact: string
  email: string
  status?: BranchStatus
}

export async function createBranch(data: CreateBranchData, actingUserId: string) {
  return prisma.$transaction(async (tx) => {
    const branch = await tx.branch.create({
      data: {
        ...data,
        status: data.status || 'active',
      },
    })
    await logActivity(
      {
        userId: actingUserId,
        action: 'Created',
        item: branch.name,
        branch: branch.name,
        details: `${branch.city} — ${branch.manager}`,
      },
      tx,
    )
    return branch
  })
}

export interface UpdateBranchData {
  name?: string
  address?: string
  city?: string
  manager?: string
  contact?: string
  email?: string
  status?: BranchStatus
}

export async function updateBranch(id: string, data: UpdateBranchData, actingUserId: string) {
  const existing = await prisma.branch.findUnique({ where: { id } })
  if (!existing) {
    throw { status: 404, message: 'Branch not found' }
  }

  return prisma.$transaction(async (tx) => {
    const branch = await tx.branch.update({
      where: { id },
      data,
    })
    await logActivity(
      {
        userId: actingUserId,
        action: 'Updated',
        item: branch.name,
        branch: branch.name,
        details: describeChangedFields(data as Record<string, unknown>),
      },
      tx,
    )
    return branch
  })
}

export async function deleteBranch(id: string, actingUserId: string) {
  const existing = await prisma.branch.findUnique({ where: { id } })
  if (!existing) {
    throw { status: 404, message: 'Branch not found' }
  }

  return prisma.$transaction(async (tx) => {
    await logActivity(
      {
        userId: actingUserId,
        action: 'Deleted',
        item: existing.name,
        branch: existing.name,
        details: `${existing.city}`,
      },
      tx,
    )
    await tx.branch.delete({ where: { id } })
  })
}
