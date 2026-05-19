import { prisma } from '../lib/prisma'
import bcrypt from 'bcryptjs'
import { describeChangedFields, logActivity } from './activity.service'

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

export async function createUser(data: CreateUserData, actingUserId: string) {
  const passwordHash = await bcrypt.hash(data.password, 10)

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
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
    await logActivity(
      {
        userId: actingUserId,
        action: 'Created',
        item: user.name,
        branch: user.assignedBranch,
        details: `User ${user.username} (${user.role})`,
      },
      tx,
    )
    return user
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

export async function updateUser(id: string, data: UpdateUserData, actingUserId: string) {
  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) {
    throw { status: 404, message: 'User not found' }
  }

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

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
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
    await logActivity(
      {
        userId: actingUserId,
        action: 'Updated',
        item: user.name,
        branch: user.assignedBranch,
        details: describeChangedFields({
          ...data,
          ...(data.password ? { password: true } : {}),
        }),
      },
      tx,
    )
    return user
  })
}

export async function deleteUser(id: string, actingUserId: string) {
  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) {
    throw { status: 404, message: 'User not found' }
  }

  return prisma.$transaction(async (tx) => {
    await logActivity(
      {
        userId: actingUserId,
        action: 'Deleted',
        item: existing.name,
        branch: existing.assignedBranch,
        details: `User ${existing.username}`,
      },
      tx,
    )
    await tx.activity.deleteMany({ where: { userId: id } })
    await tx.user.delete({ where: { id } })
  })
}
