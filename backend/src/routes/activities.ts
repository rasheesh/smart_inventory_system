import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/rbac'
import { getActivities, getActivityStats } from '../services/activity.service'

const router = Router()

const activitiesQuerySchema = z.object({
  searchUser: z.string().optional(),
  action: z.string().optional(),
  branch: z.string().optional(),
  searchItem: z.string().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

// GET /api/activities — admin only
router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  const parsed = activitiesQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid query parameters', errors: parsed.error.flatten() })
    return
  }

  try {
    const activities = await getActivities(parsed.data)
    res.json(activities)
  } catch (err) {
    console.error('[activities] GET / error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// GET /api/activities/stats — admin only
router.get('/stats', authenticate, requireRole('admin'), async (_req, res) => {
  try {
    const stats = await getActivityStats()
    res.json(stats)
  } catch (err) {
    console.error('[activities] GET /stats error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

export default router
