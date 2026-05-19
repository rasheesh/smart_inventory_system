'use client'

import { useState, useCallback } from 'react'
import { StockAdjustmentForm } from '@/components/stock-ops/stock-adjustment-form'
import { AdjustmentHistoryTable } from '@/components/stock-ops/adjustment-history-table'
import { useAuth } from '@/lib/auth-context'
import { canTransferStock } from '@/lib/permissions'
import type { StockAdjustmentPayload } from '@/lib/types'
import { submitStockAdjustment } from '@/lib/api/stock-adjustments'

export default function StockOperationsPage() {
  const { user } = useAuth()
  const userCanTransfer = user?.role ? canTransferStock(user.role) : false
  const [refreshKey, setRefreshKey] = useState(0)

  const handleStockAdjustmentSubmit = useCallback(async (payload: StockAdjustmentPayload): Promise<void> => {
    await submitStockAdjustment(payload)
    // Bump key to refresh the history table
    setRefreshKey(prev => prev + 1)
  }, [])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Stock Operations</h1>
        <p className="text-muted-foreground mt-1">
          {userCanTransfer
            ? 'Add, remove, or transfer inventory items'
            : 'Add or remove inventory items'}
        </p>
      </div>

      {/* Form and History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <StockAdjustmentForm onSubmit={handleStockAdjustmentSubmit} />
        </div>
        <div className="lg:col-span-2">
          <AdjustmentHistoryTable key={refreshKey} />
        </div>
      </div>
    </div>
  )
}
