'use client'

import { useRouter } from 'next/navigation'
import { Search, ChevronDown, LogOut } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NotificationDropdown } from '@/components/layout/notification-dropdown'
import { useAuth } from '@/lib/auth-context'

export function Header() {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const handleGlobalSearch = (query: string): void => {
    // TODO: implement global search
  }

  const getInitials = (name?: string) => {
    return (name || '')
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0] || '')
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrator'
      case 'branch-manager': return 'Branch Manager'
      case 'staff': return 'Staff'
      default: return role
    }
  }

  return (
    <div className="dashboard-header">
      {/* Search Bar */}
      <div className="flex-1 max-w-md relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search items, branches..."
          className="pl-10 bg-background border-border"
          onChange={(e) => handleGlobalSearch(e.target.value)}
        />
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <NotificationDropdown />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary transition-colors">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                {user ? getInitials(user.fullName) : '??'}
              </div>
              <div className="hidden sm:block text-sm">
                <p className="font-medium text-foreground">{user?.fullName || 'Unknown'}</p>
                <p className="text-xs text-muted-foreground">{user ? getRoleLabel(user.role) : ''}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              className="flex items-center gap-2 cursor-pointer text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
