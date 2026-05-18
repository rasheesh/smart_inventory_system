'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { AdvancedActivityFilters } from '@/lib/types'

export const defaultAdvancedActivityFilters: AdvancedActivityFilters = {
  branch: 'all',
  searchItem: '',
  dateFrom: '',
  dateTo: '',
}

interface AuditLogFiltersSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  filters: AdvancedActivityFilters
  branches: string[]
  onApply: (filters: AdvancedActivityFilters) => void
}

export function countActiveAdvancedFilters(filters: AdvancedActivityFilters): number {
  let count = 0
  if (filters.branch !== 'all') count++
  if (filters.searchItem.trim()) count++
  if (filters.dateFrom) count++
  if (filters.dateTo) count++
  return count
}

export function AuditLogFiltersSheet({
  open,
  onOpenChange,
  filters,
  branches,
  onApply,
}: AuditLogFiltersSheetProps) {
  const [draft, setDraft] = useState<AdvancedActivityFilters>(filters)

  useEffect(() => {
    if (open) {
      setDraft(filters)
    }
  }, [open, filters])

  function handleApply(): void {
    onApply(draft)
    onOpenChange(false)
  }

  function handleClear(): void {
    const cleared = { ...defaultAdvancedActivityFilters }
    setDraft(cleared)
    onApply(cleared)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>More filters</SheetTitle>
          <SheetDescription>
            Narrow audit logs by branch, date range, or item/subject.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-5 px-4 py-2 overflow-y-auto flex-1">
          <div className="space-y-2">
            <Label htmlFor="filter-branch">Branch</Label>
            <Select
              value={draft.branch}
              onValueChange={(value) => setDraft((prev) => ({ ...prev, branch: value }))}
            >
              <SelectTrigger id="filter-branch">
                <SelectValue placeholder="All branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All branches</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch} value={branch}>
                    {branch}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="filter-item">Item or subject</Label>
            <Input
              id="filter-item"
              placeholder="Search item name or details..."
              value={draft.searchItem}
              onChange={(e) => setDraft((prev) => ({ ...prev, searchItem: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="filter-date-from">From date</Label>
              <Input
                id="filter-date-from"
                type="date"
                value={draft.dateFrom}
                onChange={(e) => setDraft((prev) => ({ ...prev, dateFrom: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-date-to">To date</Label>
              <Input
                id="filter-date-to"
                type="date"
                value={draft.dateTo}
                min={draft.dateFrom || undefined}
                onChange={(e) => setDraft((prev) => ({ ...prev, dateTo: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <SheetFooter className="flex-row gap-2 sm:justify-between">
          <Button type="button" variant="outline" onClick={handleClear}>
            Clear all
          </Button>
          <Button type="button" onClick={handleApply}>
            Apply filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
