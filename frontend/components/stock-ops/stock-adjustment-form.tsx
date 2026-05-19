'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { InventoryItem, Branch, StockAdjustmentPayload } from '@/lib/types'
import { fetchInventoryItems } from '@/lib/api/inventory'
import { fetchBranches } from '@/lib/api/branches'
import { useAuth } from '@/lib/auth-context'
import { canTransferStock as checkCanTransfer, canAccessAllBranches } from '@/lib/permissions'

interface StockAdjustmentFormProps {
  onSubmit?: (payload: StockAdjustmentPayload) => Promise<void>
}

export function StockAdjustmentForm({ onSubmit }: StockAdjustmentFormProps) {
  const { user } = useAuth()
  const userCanTransfer = user?.role ? checkCanTransfer(user.role) : false
  const isAdmin = user?.role ? canAccessAllBranches(user.role) : false

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [branches, setBranches] = useState<Branch[]>([])

  useEffect(() => {
    fetchInventoryItems().then(setInventoryItems).catch(() => {})
  }, [])

  useEffect(() => {
    fetchBranches().then(setBranches).catch(() => {})
  }, [])

  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove' | 'transfer'>('add')
  const [itemId, setItemId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [fromBranch, setFromBranch] = useState(isAdmin ? '' : (user?.branch || ''))
  const [toBranch, setToBranch] = useState('')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Refresh the item list so quantities and statuses stay current
  const refreshItems = () => {
    fetchInventoryItems()
      .then(setInventoryItems)
      .catch(() => {})
  }

  // Filter items based on user branch
  const availableItems = isAdmin
    ? inventoryItems
    : inventoryItems.filter((item) => item.branch === user?.branch)

  const adjustmentTypes = userCanTransfer
    ? (['add', 'remove', 'transfer'] as const)
    : (['add', 'remove'] as const)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setSuccessMessage(null)

    if (!itemId || !quantity || !reason) {
      setFormError('Please fill in all required fields')
      return
    }

    if (adjustmentType === 'transfer' && (!fromBranch || !toBranch)) {
      setFormError('Please select both source and destination branches')
      return
    }

    if (adjustmentType !== 'transfer' && !fromBranch) {
      setFormError('Please select a branch')
      return
    }

    const formData: StockAdjustmentPayload = {
      adjustmentType,
      itemId,
      quantity: parseInt(quantity),
      fromBranch: fromBranch || undefined,
      toBranch: adjustmentType === 'transfer' ? toBranch : undefined,
      reason,
    }

    setIsSubmitting(true)
    try {
      await onSubmit?.(formData)
      setSuccessMessage('Stock adjustment submitted successfully!')
      resetForm()
      // Re-fetch items so the dropdown reflects updated quantities and statuses
      refreshItems()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit adjustment'
      setFormError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setAdjustmentType('add')
    setItemId('')
    setQuantity('')
    setFromBranch(isAdmin ? '' : (user?.branch || ''))
    setToBranch('')
    setReason('')
    setFormError(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock Adjustment</CardTitle>
        <CardDescription>
          {userCanTransfer
            ? 'Add, remove, or transfer inventory items'
            : 'Add or remove inventory items'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error / Success messages */}
          {formError && (
            <div className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
              {formError}
            </div>
          )}
          {successMessage && (
            <div className="bg-green-50 text-green-700 rounded-md px-3 py-2 text-sm">
              {successMessage}
            </div>
          )}

          {/* Adjustment Type */}
          <div>
            <label className="text-sm font-medium">Adjustment Type</label>
            <div className={`grid gap-3 mt-2 ${userCanTransfer ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {adjustmentTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setAdjustmentType(type)
                    setSuccessMessage(null)
                    setFormError(null)
                  }}
                  className={`p-3 rounded-lg border-2 transition-colors capitalize ${adjustmentType === type
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                    }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Item Selection */}
          <div>
            <label className="text-sm font-medium block mb-2">Select Item *</label>
            <Select value={itemId} onValueChange={setItemId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an item..." />
              </SelectTrigger>
              <SelectContent>
                {availableItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} ({item.sku}) — Qty: {item.quantity}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity */}
          <div>
            <label className="text-sm font-medium block mb-2">Quantity *</label>
            <Input
              type="number"
              placeholder="Enter quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
            />
          </div>

          {/* Branch Selection - Only for admin (non-transfer) */}
          {adjustmentType !== 'transfer' && (
            <div>
              <label className="text-sm font-medium block mb-2">Branch *</label>
              {isAdmin ? (
                <Select value={fromBranch} onValueChange={setFromBranch}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch..." />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.name}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={user?.branch || ''} disabled className="bg-muted" />
              )}
            </div>
          )}

          {/* Transfer Branches */}
          {adjustmentType === 'transfer' && (
            <>
              <div>
                <label className="text-sm font-medium block mb-2">From Branch *</label>
                {isAdmin ? (
                  <Select value={fromBranch} onValueChange={setFromBranch}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source branch..." />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.name}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={user?.branch || ''} disabled className="bg-muted" />
                )}
              </div>
              <div>
                <label className="text-sm font-medium block mb-2">To Branch *</label>
                <Select value={toBranch} onValueChange={setToBranch}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination branch..." />
                  </SelectTrigger>
                  <SelectContent>
                    {branches
                      .filter((branch) => branch.name !== (isAdmin ? fromBranch : user?.branch))
                      .map((branch) => (
                        <SelectItem key={branch.id} value={branch.name}>
                          {branch.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Reason */}
          <div>
            <label className="text-sm font-medium block mb-2">Reason *</label>
            <Textarea
              placeholder="Enter reason for adjustment..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit Adjustment
            </Button>
            <Button type="button" variant="outline" onClick={resetForm} className="flex-1" disabled={isSubmitting}>
              Reset
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
