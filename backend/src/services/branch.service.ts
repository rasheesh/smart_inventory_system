import { prisma } from '../lib/prisma'
import { BranchStatus } from '@prisma/client'

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

export async function createBranch(data: CreateBranchData) {
  return prisma.branch.create({
    data: {
      ...data,
      status: data.status || 'active',
    },
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

export async function updateBranch(id: string, data: UpdateBranchData) {
  return prisma.branch.update({
    where: { id },
    data,
  })
}

export async function deleteBranch(id: string) {
  return prisma.branch.delete({
    where: { id },
  })
}
