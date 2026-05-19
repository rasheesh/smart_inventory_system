'use client'

import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { Branch } from '@/lib/types'

interface SearchFilterBarProps {
  onSearch: (query: string) => void
  onBranchChange: (branch: string) => void
  onStatusChange: (status: string) => void
  onClear: () => void
  showBranchFilter?: boolean
  branches?: Branch[]
}

export function SearchFilterBar({
  onSearch,
  onBranchChange,
  onStatusChange,
  onClear,
  showBranchFilter = true,
  branches = [],
}: SearchFilterBarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBranch, setSelectedBranch] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    onSearch(value)
  }

  const handleBranchChange = (value: string) => {
    setSelectedBranch(value)
    onBranchChange(value)
  }

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value)
    onStatusChange(value)
  }

  const handleClear = () => {
    setSearchQuery('')
    setSelectedBranch('all')
    setSelectedStatus('all')
    onClear()
  }

  const hasActiveFilters = searchQuery || selectedBranch !== 'all' || selectedStatus !== 'all'

  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-sm relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by item name, SKU..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        {showBranchFilter && (
          <Select value={selectedBranch} onValueChange={handleBranchChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.name}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={selectedStatus} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="low-stock">Low Stock</SelectItem>
            <SelectItem value="expiring">Expiring</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={handleClear}>
            <X className="w-4 h-4" />
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}
