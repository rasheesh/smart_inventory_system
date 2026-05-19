import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/rbac'
import { getUsers, createUser, updateUser, deleteUser } from '../services/user.service'
import {
  isValidPassword,
  PASSWORD_REQUIREMENTS_MESSAGE,
} from '../utils/password-validation'

const router = Router()

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toFrontendRole(role: string): string {
  return role === 'branch_manager' ? 'branch-manager' : role
}

function toBackendRole(role: string): 'admin' | 'branch_manager' | 'staff' {
  if (role === 'branch-manager') return 'branch_manager'
  return role as 'admin' | 'branch_manager' | 'staff'
}

// ─── Validation schemas ───────────────────────────────────────────────────────

const passwordSchema = z
  .string()
  .refine(isValidPassword, { message: PASSWORD_REQUIREMENTS_MESSAGE })

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: passwordSchema,
  role: z.enum(['admin', 'branch-manager', 'staff']),
  assignedBranch: z.string().min(1, 'Branch is required'),
  status: z.enum(['active', 'inactive']).optional(),
})

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  username: z.string().min(3).optional(),
  password: passwordSchema.optional(),
  role: z.enum(['admin', 'branch-manager', 'staff']).optional(),
  assignedBranch: z.string().min(1).optional(),
  status: z.enum(['active', 'inactive']).optional(),
})

function validationErrorMessage(parsed: z.SafeParseError<unknown>): string {
  const fieldErrors = parsed.error.flatten().fieldErrors
  const passwordErrors = fieldErrors.password
  if (passwordErrors?.[0]) return passwordErrors[0]
  const firstField = Object.values(fieldErrors).find((msgs) => msgs?.[0])
  return firstField?.[0] ?? 'Validation error'
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/users — admin only
router.get('/', authenticate, requireRole('admin'), async (_req, res) => {
  try {
    const users = await getUsers()
    res.json(users.map((u) => ({ ...u, role: toFrontendRole(u.role) })))
  } catch (err) {
    console.error('[users] GET / error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// POST /api/users — admin only
router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: validationErrorMessage(parsed) })
    return
  }

  try {
    const user = await createUser(
      {
        ...parsed.data,
        role: toBackendRole(parsed.data.role),
      },
      req.user!.userId,
    )
    res.status(201).json({ ...user, role: toFrontendRole(user.role) })
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string; code?: string }
    if (e.status === 400) {
      res.status(400).json({ message: e.message ?? 'Bad request' })
      return
    }
    // Handle unique constraint violations (username or email already exists)
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    ) {
      const target = (err as { meta?: { target?: string[] } }).meta?.target
      if (target?.includes('username')) {
        res.status(409).json({ message: 'Username already exists' })
      } else if (target?.includes('email')) {
        res.status(409).json({ message: 'Email already exists' })
      } else {
        res.status(409).json({ message: 'User already exists' })
      }
      return
    }
    console.error('[users] POST / error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// PUT /api/users/:id — admin only
router.put('/:id', authenticate, requireRole('admin'), async (req, res) => {
  const parsed = updateUserSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: validationErrorMessage(parsed) })
    return
  }

  try {
    const updateData = { ...parsed.data } as Record<string, unknown>
    if (parsed.data.role) {
      updateData.role = toBackendRole(parsed.data.role)
    }
    const user = await updateUser(
      req.params.id as string,
      updateData as Parameters<typeof updateUser>[1],
      req.user!.userId,
    )
    res.json({ ...user, role: toFrontendRole(user.role) })
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string; code?: string }
    if (e.status === 400) {
      res.status(400).json({ message: e.message ?? 'Bad request' })
      return
    }
    if (e.status === 404 || e.code === 'P2025') {
      res.status(404).json({ message: e.message ?? 'User not found' })
      return
    }
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    ) {
      const target = (err as { meta?: { target?: string[] } }).meta?.target
      if (target?.includes('username')) {
        res.status(409).json({ message: 'Username already exists' })
      } else if (target?.includes('email')) {
        res.status(409).json({ message: 'Email already exists' })
      } else {
        res.status(409).json({ message: 'Duplicate value' })
      }
      return
    }
    console.error('[users] PUT /:id error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// DELETE /api/users/:id — admin only
router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  // Prevent admin from deleting themselves
  if (req.user?.userId === req.params.id) {
    res.status(400).json({ message: 'Cannot delete your own account' })
    return
  }

  try {
    await deleteUser(req.params.id as string, req.user!.userId)
    res.json({ message: 'User deleted successfully' })
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string; code?: string }
    if (e.status === 404 || e.code === 'P2025') {
      res.status(404).json({ message: e.message ?? 'User not found' })
      return
    }
    console.error('[users] DELETE /:id error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

export default router
