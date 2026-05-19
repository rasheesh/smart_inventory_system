'use client'

import { useMemo, useState } from 'react'
import { Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { InventoryItem } from '@/lib/types'

interface InventoryTableProps {
  items: InventoryItem[]
  searchQuery: string
  selectedBranch: string
  selectedStatus: string
  onEdit?: (item: InventoryItem) => void
  onDelete?: (item: InventoryItem) => void
}

const statusConfig: Record<string, { label: string; color: string }> = {
  normal: { label: 'Sufficient Stock', color: 'status-normal' },
  'low-stock': { label: 'Low Stock', color: 'status-warning' },
  expiring: { label: 'Expiring Soon', color: 'status-critical' },
  expired: { label: 'Expired', color: 'status-critical' },
}

function getStatusDisplay(item: InventoryItem): { label: string; color: string } {
  // Quantity 0 always shows as No Stock (RED) regardless of DB status
  if (item.quantity === 0) {
    return { label: 'No Stock', color: 'status-critical' }
  }
  return statusConfig[item.status] ?? { label: item.status, color: 'status-warning' }
}

export function InventoryTable({
  items,
  searchQuery,
  selectedBranch,
  selectedStatus,
  onEdit,
  onDelete,
}: InventoryTableProps) {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof InventoryItem
    direction: 'asc' | 'desc'
  } | null>(null)
  
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const filteredAndSortedItems = useMemo(() => {
    let filtered = items

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.sku.toLowerCase().includes(query) ||
          item.supplier.toLowerCase().includes(query)
      )
    }

    // Apply branch filter
    if (selectedBranch !== 'all') {
      filtered = filtered.filter((item) => item.branch === selectedBranch)
    }

    // Apply status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter((item) => item.status === selectedStatus)
    }

    // Apply sorting
    if (sortConfig) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key]
        const bValue = b[sortConfig.key]

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue)
        }

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue
        }

        return 0
      })
    }

    return filtered
  }, [items, searchQuery, selectedBranch, selectedStatus, sortConfig])

  // Reset pagination if filters change
  useMemo(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedBranch, selectedStatus])

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedItems.length / itemsPerPage))
  const paginatedItems = filteredAndSortedItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handleSort = (key: keyof InventoryItem) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        }
      }
      return { key, direction: 'asc' }
    })
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory Items</CardTitle>
        <CardDescription>{filteredAndSortedItems.length} items found</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('name')}
                >
                  Item Name
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('sku')}
                >
                  SKU
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('quantity')}
                >
                  Quantity
                </TableHead>
                <TableHead>Reorder Level</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('expiryDate')}
                >
                  Expiry Date
                </TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No items found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.sku}</TableCell>
                    <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                    <TableCell className="text-sm">{item.reorderLevel}</TableCell>
                    <TableCell className="text-sm">{formatDate(item.expiryDate)}</TableCell>
                    <TableCell className="text-sm">{item.supplier}</TableCell>
                    <TableCell className="text-sm">{item.branch}</TableCell>
                    <TableCell>
                      <span className={`status-badge ${getStatusDisplay(item).color}`}>
                        {getStatusDisplay(item).label}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit?.(item)}
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete?.(item)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredAndSortedItems.length)} of{' '}
              {filteredAndSortedItems.length} items
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <div className="flex items-center px-2 text-sm">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
