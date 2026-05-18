'use client'

import { Edit2, Trash2, MapPin, Phone } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Branch } from '@/lib/types'

interface BranchTableProps {
  branches: Branch[]
  onEdit?: (branch: Branch) => void
  onDelete?: (branch: Branch) => void
}

export function BranchTable({ branches, onEdit, onDelete }: BranchTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Branches</CardTitle>
        <CardDescription>Manage all branch locations and details</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Branch Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No branches found.
                  </TableCell>
                </TableRow>
              ) : (
                branches.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell className="font-medium">{branch.name}</TableCell>
                    <TableCell>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm">{branch.address}</p>
                          <p className="text-xs text-muted-foreground">{branch.city}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                          {branch.manager.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="text-sm">{branch.manager}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        {branch.contact}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`status-badge ${
                        branch.status === 'active' ? 'status-normal' : 'status-inactive'
                      }`}>
                        {branch.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => onEdit?.(branch)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => onDelete?.(branch)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
