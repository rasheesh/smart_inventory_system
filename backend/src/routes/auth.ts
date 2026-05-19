import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { JWT_SECRET, JWT_EXPIRES_IN } from '../lib/env'
import { authenticate } from '../middleware/auth'

const router = Router()

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Validation error', errors: parsed.error.flatten() })
    return
  }

  const { username, password } = parsed.data

  try {
    const user = await prisma.user.findUnique({ where: { username } })

    if (!user) {
      res.status(401).json({ message: 'Invalid username or password' })
      return
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash)
    if (!passwordMatch) {
      res.status(401).json({ message: 'Invalid username or password' })
      return
    }

    // Normalize role for JWT payload (store as hyphenated for frontend compatibility)
    const roleForJwt = user.role === 'branch_manager' ? 'branch-manager' : user.role

    const token = jwt.sign(
      {
        sub: user.id,
        role: roleForJwt,
        branch: user.assignedBranch,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions,
    )

    res.json({
      token,
      user: {
        id: user.id,
        fullName: user.name,
        role: roleForJwt,
        branch: user.assignedBranch,
      },
    })
  } catch (err) {
    console.error('[auth] Login error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// POST /api/auth/logout
router.post('/logout', authenticate, (_req, res) => {
  // Stateless JWT — no server-side session to invalidate
  res.json({ message: 'Logged out successfully' })
})

export default router
