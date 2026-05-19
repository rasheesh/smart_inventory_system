'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, Trash2, Mail, LogIn, Loader2, Search, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth-context'
import { fetchUsers, createUserApi, updateUserApi, deleteUserApi } from '@/lib/api/users'
import { fetchBranches } from '@/lib/api/branches'
import { isStrongPassword, PASSWORD_REQUIREMENTS_MESSAGE } from '@/lib/password'
import type { User, Branch, UserRole } from '@/lib/types'

const roleConfig: Record<string, { label: string; color: string }> = {
  admin: { label: 'Admin', color: 'bg-primary/10 text-primary' },
  'branch-manager': { label: 'Branch Manager', color: 'bg-blue-50 text-blue-700' },
  branch_manager: { label: 'Branch Manager', color: 'bg-blue-50 text-blue-700' },
  staff: { label: 'Staff', color: 'bg-gray-50 text-gray-700' },
}

const defaultRoleStyle = { label: 'Unknown', color: 'bg-gray-50 text-gray-700' }

// ─── Form state ───────────────────────────────────────────────────────────────

interface UserFormState {
  name: string
  email: string
  username: string
  password: string
  role: UserRole
  assignedBranch: string
  status: 'active' | 'inactive'
}

const emptyForm: UserFormState = {
  name: '',
  email: '',
  username: '',
  password: '',
  role: 'staff',
  assignedBranch: '',
  status: 'active',
}

export default function UserManagementPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Modal state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [form, setForm] = useState<UserFormState>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/')
    }
  }, [user, router])

  const loadUsers = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchUsers()
      setUsers(data)
    } catch {
      setError('Failed to load users')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
    fetchBranches()
      .then(setBranches)
      .catch(() => {
        /* branches are optional context */
      })
  }, [loadUsers])

  if (!user || user.role !== 'admin') return null

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Filter users by search query
  const filteredUsers = users.filter((u) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.assignedBranch.toLowerCase().includes(q)
    )
  })

  const totalUsers = users.length
  const activeUsers = users.filter((u) => u.status === 'active').length
  const inactiveUsers = users.filter((u) => u.status === 'inactive').length

  // ─── Form handlers ────────────────────────────────────────────────────────────

  function openAddModal() {
    setEditingUser(null)
    setForm(emptyForm)
    setFormError(null)
    setShowPassword(false)
    setIsFormOpen(true)
  }

  function openEditModal(target: User) {
    setEditingUser(target)
    setForm({
      name: target.name,
      email: target.email,
      username: '', // not shown for edit unless they want to change it
      password: '',
      role: target.role,
      assignedBranch: target.assignedBranch,
      status: target.status,
    })
    setFormError(null)
    setShowPassword(false)
    setIsFormOpen(true)
  }

  function updateField<K extends keyof UserFormState>(key: K, value: UserFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setFormError(null)

    // Basic client-side validation
    if (!form.name.trim()) {
      setFormError('Name is required')
      return
    }
    if (!form.email.trim()) {
      setFormError('Email is required')
      return
    }
    if (!editingUser && !form.username.trim()) {
      setFormError('Username is required')
      return
    }
    if (!editingUser && !form.password) {
      setFormError('Password is required for new users')
      return
    }
    if (form.password && !isStrongPassword(form.password)) {
      setFormError(PASSWORD_REQUIREMENTS_MESSAGE)
      return
    }
    if (!form.assignedBranch) {
      setFormError('Branch is required')
      return
    }

    setIsSaving(true)
    try {
      if (editingUser) {
        // Only send changed fields
        const payload: Record<string, unknown> = {}
        if (form.name !== editingUser.name) payload.name = form.name
        if (form.email !== editingUser.email) payload.email = form.email
        if (form.username.trim()) payload.username = form.username
        if (form.password) payload.password = form.password
        if (form.role !== editingUser.role) payload.role = form.role
        if (form.assignedBranch !== editingUser.assignedBranch) payload.assignedBranch = form.assignedBranch
        if (form.status !== editingUser.status) payload.status = form.status

        await updateUserApi(editingUser.id, payload)
      } else {
        await createUserApi({
          name: form.name,
          email: form.email,
          username: form.username,
          password: form.password,
          role: form.role,
          assignedBranch: form.assignedBranch,
          status: form.status,
        })
      }

      setIsFormOpen(false)
      await loadUsers()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save user'
      setFormError(message)
    } finally {
      setIsSaving(false)
    }
  }

  // ─── Delete handler ────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await deleteUserApi(deleteTarget.id)
      setDeleteTarget(null)
      await loadUsers()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete user'
      setFormError(message)
      setDeleteTarget(null)
    } finally {
      setIsDeleting(false)
    }
  }

  // Branch options: include existing branches + "All Branches" for admin
  const branchOptions = [
    { value: 'All Branches', label: 'All Branches' },
    ...branches.map((b) => ({ value: b.name, label: b.name })),
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-1">Manage system users and permissions</p>
        </div>
        <Button size="sm" onClick={openAddModal}>
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg p-6 border border-border">
          <p className="text-sm font-medium text-muted-foreground">Total Users</p>
          <p className="text-3xl font-bold text-foreground mt-2">{totalUsers}</p>
        </div>
        <div className="bg-card rounded-lg p-6 border border-border">
          <p className="text-sm font-medium text-muted-foreground">Active Users</p>
          <p className="text-3xl font-bold text-status-normal mt-2">{activeUsers}</p>
        </div>
        <div className="bg-card rounded-lg p-6 border border-border">
          <p className="text-sm font-medium text-muted-foreground">Inactive Users</p>
          <p className="text-3xl font-bold text-status-inactive mt-2">{inactiveUsers}</p>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>All system users and their roles</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading users...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? 'No users match your search.' : 'No users found.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Assigned Branch</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((member) => {
                    const role = roleConfig[member.role] ?? defaultRoleStyle
                    return (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                              {member.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')}
                            </div>
                            {member.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            {member.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs font-medium ${role.color}`}
                          >
                            {role.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">{member.assignedBranch}</TableCell>
                        <TableCell>
                          <span
                            className={`status-badge ${
                              member.status === 'active' ? 'status-normal' : 'status-inactive'
                            }`}
                          >
                            {member.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <LogIn className="w-4 h-4" />
                            {formatDate(member.lastLogin)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(member)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(member)}
                              disabled={member.id === user.id}
                              title={member.id === user.id ? 'Cannot delete your own account' : 'Delete user'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Add / Edit Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
            <DialogDescription>
              {editingUser
                ? 'Update user details. Leave password blank to keep it unchanged.'
                : 'Fill in the details to create a new user.'}
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
              <Label htmlFor="user-name">Full Name</Label>
              <Input
                id="user-name"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g. Juan Dela Cruz"
              />
            </div>

            {/* Email */}
            <div className="grid gap-2">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="e.g. juan@invsys.ph"
              />
            </div>

            {/* Username */}
            <div className="grid gap-2">
              <Label htmlFor="user-username">
                Username {editingUser && <span className="text-muted-foreground font-normal">(leave blank to keep current)</span>}
              </Label>
              <Input
                id="user-username"
                value={form.username}
                onChange={(e) => updateField('username', e.target.value)}
                placeholder={editingUser ? 'Leave blank to keep current' : 'e.g. juan_dc'}
              />
            </div>

            {/* Password */}
            <div className="grid gap-2">
              <Label htmlFor="user-password">
                Password {editingUser && <span className="text-muted-foreground font-normal">(leave blank to keep current)</span>}
              </Label>
              <div className="relative">
                <Input
                  id="user-password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  placeholder={
                    editingUser
                      ? 'Leave blank to keep current'
                      : '8+ chars with upper, lower, number, special'
                  }
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Role */}
            <div className="grid gap-2">
              <Label htmlFor="user-role">Role</Label>
              <select
                id="user-role"
                value={form.role}
                onChange={(e) => updateField('role', e.target.value as UserRole)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="staff">Staff</option>
                <option value="branch-manager">Branch Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* Branch */}
            <div className="grid gap-2">
              <Label htmlFor="user-branch">Assigned Branch</Label>
              <select
                id="user-branch"
                value={form.assignedBranch}
                onChange={(e) => updateField('assignedBranch', e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select a branch...</option>
                {branchOptions.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="grid gap-2">
              <Label htmlFor="user-status">Status</Label>
              <select
                id="user-status"
                value={form.status}
                onChange={(e) => updateField('status', e.target.value as 'active' | 'inactive')}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingUser ? 'Save Changes' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ────────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action
              cannot be undone and will also remove all their activity logs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
