import { Router } from 'express'
import { z } from 'zod'
import { requestPasswordReset, resetPassword } from '../services/password-reset.service'

const router = Router()

const forgotSchema = z.object({
  email: z.string().email('Invalid email address'),
})

const resetSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const parsed = forgotSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.errors[0]?.message ?? 'Validation error' })
    return
  }

  try {
    // Always return 200 regardless of whether the email exists (prevents user enumeration)
    await requestPasswordReset(parsed.data.email)
    res.json({ message: 'If an account exists with that email, a reset link has been sent.' })
  } catch (err) {
    console.error('[password-reset] forgot-password error:', err)
    // Still return 200 to prevent enumeration
    res.json({ message: 'If an account exists with that email, a reset link has been sent.' })
  }
})

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const parsed = resetSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.errors[0]?.message ?? 'Validation error' })
    return
  }

  try {
    const result = await resetPassword(parsed.data.token, parsed.data.password)

    if (!result.ok) {
      const message =
        result.reason === 'expired'
          ? 'This reset link has expired. Please request a new one.'
          : 'This reset link is invalid or has already been used.'
      res.status(400).json({ message })
      return
    }

    res.json({ message: 'Password updated successfully.' })
  } catch (err) {
    console.error('[password-reset] reset-password error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

export default router
