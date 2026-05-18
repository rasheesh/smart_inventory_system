import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { sendPasswordResetEmail } from './email.service'

const TOKEN_BYTES = 32
const TOKEN_EXPIRY_MS = 60 * 60 * 1000 // 1 hour
const BCRYPT_ROUNDS = 10

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex')
}

function generateRawToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString('hex')
}

export async function requestPasswordReset(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase()

  const user = await prisma.user.findFirst({
    where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
  })

  if (!user || user.status !== 'active') {
    return
  }

  const rawToken = generateRawToken()
  const tokenHash = hashToken(rawToken)
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS)

  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  })

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  })

  await sendPasswordResetEmail(user.email, rawToken)
}

export async function resetPassword(
  rawToken: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; reason: 'invalid' | 'expired' }> {
  const tokenHash = hashToken(rawToken.trim())

  const resetRecord = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  })

  if (!resetRecord) {
    const expiredRecord = await prisma.passwordResetToken.findFirst({
      where: { tokenHash },
    })
    if (expiredRecord) {
      return { ok: false, reason: 'expired' }
    }
    return { ok: false, reason: 'invalid' }
  }

  if (resetRecord.user.status !== 'active') {
    return { ok: false, reason: 'invalid' }
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.updateMany({
      where: { userId: resetRecord.userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ])

  return { ok: true }
}
