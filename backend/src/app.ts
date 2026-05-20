import 'dotenv/config' // load .env before anything else (local dev)
import './lib/env' // triggers startup validation first
import express from 'express'
import cors from 'cors'
import { CORS_ORIGIN } from './lib/env'
import authRouter from './routes/auth'
import inventoryRouter from './routes/inventory'
import branchesRouter from './routes/branches'
import usersRouter from './routes/users'
import stockAdjustmentsRouter from './routes/stock-adjustments'
import activitiesRouter from './routes/activities'
import alertsRouter from './routes/alerts'
import passwordResetRouter from './routes/password-reset'

const app = express()

// Middleware
app.use(
  cors({
    origin: CORS_ORIGIN.split(',').map((o) => o.trim()),
    credentials: true,
  }),
)
app.use(express.json())

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// Routes
app.use('/api/auth', authRouter)
app.use('/api/auth', passwordResetRouter)
app.use('/api/inventory', inventoryRouter)
app.use('/api/branches', branchesRouter)
app.use('/api/users', usersRouter)
app.use('/api/stock-adjustments', stockAdjustmentsRouter)
app.use('/api/activities', activitiesRouter)
app.use('/api/alerts', alertsRouter)

export default app

