'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchFilterBar } from '@/components/inventory/search-filter-bar'
import { InventoryTable } from '@/components/inventory/inventory-table'
import {
  fetchInventoryItems,
  createInventoryItemApi,
  updateInventoryItemApi,
  deleteInventoryItemApi,
  exportInventoryCSV,
} from '@/lib/api/inventory'
import { fetchBranches } from '@/lib/api/branches'
import { useAuth } from '@/lib/auth-context'
import { canAccessAllBranches } from '@/lib/permissions'
import type { InventoryItem, Branch } from '@/lib/types'

// ─── Add/Edit Item form state ──────────────────────────────────────────────────

interface ItemFormState {
  id?: string
  name: string
  sku: string
  quantity: string // Only used for creation
  price: string
  reorderLevel: string
  expiryDate: string
  supplier: string
  branch: string
}

const emptyForm: ItemFormState = {
  name: '',
  sku: '',
  quantity: '',
  price: '',
  reorderLevel: '',
  expiryDate: '',
  supplier: '',
  branch: '',
}

export default function InventoryPage() {
  const { user } = useAuth()
  const isAdmin = user?.role ? canAccessAllBranches(user.role) : false

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBranch, setSelectedBranch] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [items, setItems] = useState<InventoryItem[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Add/Edit Item modal state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add')
  const [form, setForm] = useState<ItemFormState>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Delete modal state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Export state
  const [isExporting, setIsExporting] = useState(false)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [inventoryData, branchData] = await Promise.all([
        fetchInventoryItems(),
        fetchBranches(),
      ])
      setItems(inventoryData)
      setBranches(branchData)
    } catch {
      setError('Failed to load inventory data')
      setItems([])
      setBranches([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ─── Handlers ────────────────────────────────────────────────────────

  function openAddModal() {
    setFormMode('add')
    setForm({
      ...emptyForm,
      branch: isAdmin ? '' : (user?.branch ?? ''),
    })
    setFormError(null)
    setIsFormOpen(true)
  }

  function openEditModal(item: InventoryItem) {
    setFormMode('edit')
    setForm({
      id: item.id,
      name: item.name,
      sku: item.sku,
      quantity: item.quantity.toString(),
      price: item.price.toString(),
      reorderLevel: item.reorderLevel.toString(),
      expiryDate: item.expiryDate.toISOString().split('T')[0],
      supplier: item.supplier,
      branch: item.branch,
    })
    setFormError(null)
    setIsFormOpen(true)
  }

  function openDeleteModal(item: InventoryItem) {
    setItemToDelete(item)
    setIsDeleteDialogOpen(true)
  }

  function updateField<K extends keyof ItemFormState>(key: K, value: ItemFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setFormError(null)

    // Validation
    if (!form.name.trim()) { setFormError('Name is required'); return }
    if (!form.sku.trim()) { setFormError('SKU is required'); return }
    if (formMode === 'add' && (!form.quantity || Number(form.quantity) < 0)) { 
      setFormError('Quantity must be 0 or more')
      return 
    }
    if (!form.price || Number(form.price) < 0) { setFormError('Price must be 0 or more'); return }
    if (!form.reorderLevel || Number(form.reorderLevel) < 0) { setFormError('Reorder level must be 0 or more'); return }
    if (!form.expiryDate) { setFormError('Expiry date is required'); return }
    if (!form.supplier.trim()) { setFormError('Supplier is required'); return }
    if (!form.branch) { setFormError('Branch is required'); return }

    setIsSaving(true)
    try {
      if (formMode === 'add') {
        await createInventoryItemApi({
          name: form.name.trim(),
          sku: form.sku.trim(),
          quantity: parseInt(form.quantity, 10),
          price: parseFloat(form.price),
          reorderLevel: parseInt(form.reorderLevel, 10),
          expiryDate: form.expiryDate,
          supplier: form.supplier.trim(),
          branch: form.branch,
        })
      } else if (formMode === 'edit' && form.id) {
        await updateInventoryItemApi(form.id, {
          name: form.name.trim(),
          sku: form.sku.trim(),
          price: parseFloat(form.price),
          reorderLevel: parseInt(form.reorderLevel, 10),
          expiryDate: form.expiryDate,
          supplier: form.supplier.trim(),
          branch: form.branch,
        })
      }
      setIsFormOpen(false)
      await loadData()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : `Failed to ${formMode} item`
      setFormError(message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!itemToDelete) return
    setIsDeleting(true)
    try {
      await deleteInventoryItemApi(itemToDelete.id)
      setIsDeleteDialogOpen(false)
      setItemToDelete(null)
      await loadData()
    } catch (err) {
      setError('Failed to delete item')
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleExportInventory() {
    setIsExporting(true)
    try {
      await exportInventoryCSV()
    } catch {
      setError('Failed to export inventory')
    } finally {
      setIsExporting(false)
    }
  }

  // Non-admin users only see their branch items
  const branchFilteredItems = isAdmin
    ? items
    : items.filter((item) => item.branch === user?.branch)

  // Branch options for the form select
  const branchOptions = branches.map((b) => ({ value: b.name, label: b.name }))

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Inventory Management</h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin
              ? 'View and manage all inventory items across branches'
              : `Manage inventory items for ${user?.branch}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportInventory}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Export
          </Button>
          <Button size="sm" onClick={openAddModal}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Search and Filters */}
      <SearchFilterBar
        onSearch={setSearchQuery}
        onBranchChange={setSelectedBranch}
        onStatusChange={setSelectedStatus}
        onClear={() => {
          setSearchQuery('')
          setSelectedBranch('all')
          setSelectedStatus('all')
        }}
        showBranchFilter={isAdmin}
        branches={branches}
      />

      {/* Table */}
      <InventoryTable
        items={branchFilteredItems}
        searchQuery={searchQuery}
        selectedBranch={selectedBranch}
        selectedStatus={selectedStatus}
        onEdit={openEditModal}
        onDelete={openDeleteModal}
      />

      {/* ─── Add/Edit Item Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{formMode === 'add' ? 'Add New Item' : 'Edit Item'}</DialogTitle>
            <DialogDescription>
              {formMode === 'add'
                ? 'Fill in the details to add a new inventory item. Status will be determined automatically.'
                : 'Modify item details. Note: Stock quantity can only be updated via Stock Operations.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {formError && (
              <div className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
                {formError}
              </div>
            )}

            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="item-name">Item Name</Label>
              <Input
                id="item-name"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g. Bigas (Rice) - 25kg Bag"
              />
            </div>

            {/* SKU */}
            <div className="grid gap-2">
              <Label htmlFor="item-sku">SKU</Label>
              <Input
                id="item-sku"
                value={form.sku}
                onChange={(e) => updateField('sku', e.target.value)}
                placeholder="e.g. BIG-001"
              />
            </div>

            {/* Quantity & Price */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="item-quantity">Quantity</Label>
                <Input
                  id="item-quantity"
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={(e) => updateField('quantity', e.target.value)}
                  placeholder="0"
                  disabled={formMode === 'edit'} // Disable editing quantity
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="item-price">Price (₱)</Label>
                <Input
                  id="item-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => updateField('price', e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Reorder Level & Expiry Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="item-reorder">Reorder Level</Label>
                <Input
                  id="item-reorder"
                  type="number"
                  min="0"
                  value={form.reorderLevel}
                  onChange={(e) => updateField('reorderLevel', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="item-expiry">Expiry Date</Label>
                <Input
                  id="item-expiry"
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) => updateField('expiryDate', e.target.value)}
                />
              </div>
            </div>

            {/* Supplier */}
            <div className="grid gap-2">
              <Label htmlFor="item-supplier">Supplier</Label>
              <Input
                id="item-supplier"
                value={form.supplier}
                onChange={(e) => updateField('supplier', e.target.value)}
                placeholder="e.g. NFA Trading Co."
              />
            </div>

            {/* Branch */}
            <div className="grid gap-2">
              <Label htmlFor="item-branch">Branch</Label>
              {isAdmin ? (
                <select
                  id="item-branch"
                  value={form.branch}
                  onChange={(e) => updateField('branch', e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Select a branch...</option>
                  {branchOptions.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </select>
              ) : (
                <Input id="item-branch" value={form.branch} disabled />
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {formMode === 'add' ? 'Add Item' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Dialog ────────────────────────────────────────────── */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-semibold">{itemToDelete?.name}</span>? 
              This will also remove its associated stock adjustment history. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
