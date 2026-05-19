import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { JWT_SECRET, JWT_EXPIRES_IN } from '../lib/env'

const router = Router()

// Mock demo credentials (development only)
const DEMO_CREDENTIALS: Record<string, { password: string; fullName: string; role: string; branch: string }> = {
  admin: { password: 'password123', fullName: 'Administrator', role: 'admin', branch: 'all' },
  manila_manager: { password: 'manila2024', fullName: 'Maria Santos', role: 'branch-manager', branch: 'Manila Branch' },
  cebu_manager: { password: 'cebu2024', fullName: 'Juan Dela Cruz', role: 'branch-manager', branch: 'Cebu Branch' },
  davao_manager: { password: 'davao2024', fullName: 'Rosa Garcia', role: 'branch-manager', branch: 'Davao Branch' },
  manila_staff: { password: 'staff123', fullName: 'Anna Lopez', role: 'staff', branch: 'Manila Branch' },
  cebu_staff: { password: 'staff123', fullName: 'Miguel Rodriguez', role: 'staff', branch: 'Cebu Branch' },
  davao_staff: { password: 'staff123', fullName: 'Christine Reyes', role: 'staff', branch: 'Davao Branch' },
}

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
    const cred = DEMO_CREDENTIALS[username]

    if (!cred || cred.password !== password) {
      res.status(401).json({ message: 'Invalid username or password' })
      return
    }

    const token = jwt.sign(
      {
        sub: username,
        role: cred.role,
        branch: cred.branch,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions,
    )

    res.json({
      token,
      user: {
        id: username,
        fullName: cred.fullName,
        role: cred.role,
        branch: cred.branch,
      },
    })
  } catch (err) {
    console.error('[auth] Login error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  // Stateless JWT — no server-side session to invalidate
  res.json({ message: 'Logged out successfully' })
})

export default router
