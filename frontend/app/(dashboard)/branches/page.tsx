'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2 } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BranchTable } from '@/components/branches/branch-table'
import {
  fetchBranches,
  createBranchApi,
  updateBranchApi,
  deleteBranchApi,
} from '@/lib/api/branches'
import { useAuth } from '@/lib/auth-context'
import type { Branch } from '@/lib/types'

interface BranchFormState {
  id?: string
  name: string
  address: string
  city: string
  manager: string
  contact: string
  email: string
  status: string
}

const emptyForm: BranchFormState = {
  name: '',
  address: '',
  city: '',
  manager: '',
  contact: '',
  email: '',
  status: 'active',
}

export default function BranchesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [branches, setBranches] = useState<Branch[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add')
  const [form, setForm] = useState<BranchFormState>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Delete State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchBranches()
      setBranches(data)
    } catch {
      setError('Failed to load branches')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/')
      return
    }
    loadData()
  }, [user, router, loadData])

  if (!user || user.role !== 'admin') return null

  // ─── Handlers ──────────────────────────────────────────────────────────────

  function openAddModal() {
    setFormMode('add')
    setForm(emptyForm)
    setFormError(null)
    setIsFormOpen(true)
  }

  function openEditModal(branch: Branch) {
    setFormMode('edit')
    setForm({ ...branch })
    setFormError(null)
    setIsFormOpen(true)
  }

  function openDeleteModal(branch: Branch) {
    setBranchToDelete(branch)
    setIsDeleteDialogOpen(true)
  }

  function updateField<K extends keyof BranchFormState>(key: K, value: BranchFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setFormError(null)

    // Validation
    if (!form.name.trim()) { setFormError('Name is required'); return }
    if (!form.address.trim()) { setFormError('Address is required'); return }
    if (!form.city.trim()) { setFormError('City is required'); return }
    if (!form.manager.trim()) { setFormError('Manager name is required'); return }
    if (!form.contact.trim()) { setFormError('Contact number is required'); return }
    if (!form.email.trim()) { setFormError('Email is required'); return }

    setIsSaving(true)
    try {
      if (formMode === 'add') {
        await createBranchApi({
          name: form.name.trim(),
          address: form.address.trim(),
          city: form.city.trim(),
          manager: form.manager.trim(),
          contact: form.contact.trim(),
          email: form.email.trim(),
          status: form.status,
        })
      } else if (formMode === 'edit' && form.id) {
        await updateBranchApi(form.id, {
          name: form.name.trim(),
          address: form.address.trim(),
          city: form.city.trim(),
          manager: form.manager.trim(),
          contact: form.contact.trim(),
          email: form.email.trim(),
          status: form.status,
        })
      }
      setIsFormOpen(false)
      await loadData()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : `Failed to ${formMode} branch`
      setFormError(message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!branchToDelete) return
    setIsDeleting(true)
    try {
      await deleteBranchApi(branchToDelete.id)
      setIsDeleteDialogOpen(false)
      setBranchToDelete(null)
      await loadData()
    } catch (err) {
      setError('Failed to delete branch')
    } finally {
      setIsDeleting(false)
    }
  }

  const totalBranches = branches.length
  const activeBranches = branches.filter(b => b.status === 'active').length
  const inactiveBranches = branches.filter(b => b.status === 'inactive').length

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Branch Management</h1>
          <p className="text-muted-foreground mt-1">View and manage all branch locations</p>
        </div>
        <Button size="sm" onClick={openAddModal}>
          <Plus className="w-4 h-4 mr-2" />
          Add Branch
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Branch Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg p-6 border border-border">
          <p className="text-sm font-medium text-muted-foreground">Total Branches</p>
          <p className="text-3xl font-bold text-foreground mt-2">{totalBranches}</p>
        </div>
        <div className="bg-card rounded-lg p-6 border border-border">
          <p className="text-sm font-medium text-muted-foreground">Active Branches</p>
          <p className="text-3xl font-bold text-foreground mt-2">{activeBranches}</p>
        </div>
        <div className="bg-card rounded-lg p-6 border border-border">
          <p className="text-sm font-medium text-muted-foreground">Inactive Branches</p>
          <p className="text-3xl font-bold text-foreground mt-2">{inactiveBranches}</p>
        </div>
      </div>

      {/* Table */}
      <BranchTable 
        branches={branches} 
        onEdit={openEditModal} 
        onDelete={openDeleteModal} 
      />

      {/* ─── Add/Edit Branch Dialog ────────────────────────────────────────────────── */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{formMode === 'add' ? 'Add New Branch' : 'Edit Branch'}</DialogTitle>
            <DialogDescription>
              {formMode === 'add'
                ? 'Fill in the details to add a new branch to the system.'
                : 'Modify the branch details below.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {formError && (
              <div className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
                {formError}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="branch-name">Branch Name</Label>
              <Input
                id="branch-name"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g. Makati Branch"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="branch-city">City</Label>
                <Input
                  id="branch-city"
                  value={form.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  placeholder="e.g. Makati City"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="branch-contact">Contact Number</Label>
                <Input
                  id="branch-contact"
                  value={form.contact}
                  onChange={(e) => updateField('contact', e.target.value)}
                  placeholder="e.g. 0917-123-4567"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="branch-address">Full Address</Label>
              <Input
                id="branch-address"
                value={form.address}
                onChange={(e) => updateField('address', e.target.value)}
                placeholder="e.g. 123 Ayala Avenue"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="branch-manager">Branch Manager Name</Label>
              <Input
                id="branch-manager"
                value={form.manager}
                onChange={(e) => updateField('manager', e.target.value)}
                placeholder="e.g. Juan Dela Cruz"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="branch-email">Email Address</Label>
              <Input
                id="branch-email"
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="e.g. branch@example.com"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="branch-status">Status</Label>
              <Select value={form.status} onValueChange={(val) => updateField('status', val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {formMode === 'add' ? 'Add Branch' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Dialog ────────────────────────────────────────────── */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Branch</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-semibold">{branchToDelete?.name}</span>? 
              This action cannot be undone. Make sure no users or inventory items are assigned to this branch before deleting.
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
