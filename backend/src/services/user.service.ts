import { prisma } from '../lib/prisma'
import bcrypt from 'bcryptjs'

export async function getUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      role: true,
      assignedBranch: true,
      status: true,
      lastLogin: true,
      // passwordHash intentionally omitted
    },
  })
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      role: true,
      assignedBranch: true,
      status: true,
      lastLogin: true,
    },
  })
}

export interface CreateUserData {
  name: string
  email: string
  username: string
  password: string
  role: 'admin' | 'branch_manager' | 'staff'
  assignedBranch: string
  status?: 'active' | 'inactive'
}

export async function createUser(data: CreateUserData) {
  const passwordHash = await bcrypt.hash(data.password, 10)
  return prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      username: data.username,
      passwordHash,
      role: data.role,
      assignedBranch: data.assignedBranch,
      status: data.status ?? 'active',
    },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      role: true,
      assignedBranch: true,
      status: true,
      lastLogin: true,
    },
  })
}

export interface UpdateUserData {
  name?: string
  email?: string
  username?: string
  password?: string
  role?: 'admin' | 'branch_manager' | 'staff'
  assignedBranch?: string
  status?: 'active' | 'inactive'
}

export async function updateUser(id: string, data: UpdateUserData) {
  const updatePayload: Record<string, unknown> = {}

  if (data.name !== undefined) updatePayload.name = data.name
  if (data.email !== undefined) updatePayload.email = data.email
  if (data.username !== undefined) updatePayload.username = data.username
  if (data.role !== undefined) updatePayload.role = data.role
  if (data.assignedBranch !== undefined) updatePayload.assignedBranch = data.assignedBranch
  if (data.status !== undefined) updatePayload.status = data.status
  if (data.password) {
    updatePayload.passwordHash = await bcrypt.hash(data.password, 10)
  }

  return prisma.user.update({
    where: { id },
    data: updatePayload,
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      role: true,
      assignedBranch: true,
      status: true,
      lastLogin: true,
    },
  })
}

export async function deleteUser(id: string) {
  // Delete related activities first to avoid FK constraint errors
  await prisma.activity.deleteMany({ where: { userId: id } })
  return prisma.user.delete({ where: { id } })
}
