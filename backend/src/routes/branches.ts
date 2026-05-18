import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { requireMinRole } from '../middleware/rbac'
import {
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch,
} from '../services/branch.service'

const router = Router()

// ─── GET /api/branches ───────────────────────────────────────────────────────
router.get('/', authenticate, async (_req, res) => {
  try {
    const branches = await getBranches()
    res.json(branches)
  } catch (err) {
    console.error('[branches] GET / error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// ─── POST /api/branches ──────────────────────────────────────────────────────
const createBranchSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  manager: z.string().min(1, 'Manager is required'),
  contact: z.string().min(1, 'Contact is required'),
  email: z.string().email('Valid email is required'),
  status: z.enum(['active', 'inactive']).optional(),
})

router.post('/', authenticate, requireMinRole('admin'), async (req, res) => {
  const parsed = createBranchSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Validation error', errors: parsed.error.flatten() })
    return
  }

  try {
    const branch = await createBranch(parsed.data)
    res.status(201).json(branch)
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    ) {
      res.status(409).json({ message: 'A branch with this name already exists' })
      return
    }
    console.error('[branches] POST / error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// ─── PUT /api/branches/:id ───────────────────────────────────────────────────
const updateBranchSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  manager: z.string().min(1).optional(),
  contact: z.string().min(1).optional(),
  email: z.string().email().optional(),
  status: z.enum(['active', 'inactive']).optional(),
})

router.put('/:id', authenticate, requireMinRole('admin'), async (req, res) => {
  const parsed = updateBranchSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Validation error', errors: parsed.error.flatten() })
    return
  }

  try {
    const branch = await updateBranch(req.params.id as string, parsed.data)
    res.json(branch)
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2025'
    ) {
      res.status(404).json({ message: 'Branch not found' })
      return
    }
    console.error('[branches] PUT /:id error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// ─── DELETE /api/branches/:id ────────────────────────────────────────────────
router.delete('/:id', authenticate, requireMinRole('admin'), async (req, res) => {
  try {
    await deleteBranch(req.params.id as string)
    res.json({ message: 'Branch deleted successfully' })
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2025'
    ) {
      res.status(404).json({ message: 'Branch not found' })
      return
    }
    console.error('[branches] DELETE /:id error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

export default router
