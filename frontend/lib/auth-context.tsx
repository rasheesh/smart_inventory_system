'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { UserRole } from './types'
import { apiFetch, setToken, clearToken } from './api/client'

export interface AuthUser {
  id: string
  username: string
  fullName: string
  role: UserRole
  branch: string
}

interface AuthContextType {
  isAuthenticated: boolean
  user: AuthUser | null
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Restore session from sessionStorage on mount (token is in-memory via client.ts)
  useEffect(() => {
    const storedUser = sessionStorage.getItem('auth_user')
    const storedToken = sessionStorage.getItem('auth_token')
    if (storedUser && storedToken) {
      try {
        const userData = JSON.parse(storedUser) as AuthUser
        setToken(storedToken)
        setIsAuthenticated(true)
        setUser(userData)
      } catch {
        sessionStorage.removeItem('auth_user')
        sessionStorage.removeItem('auth_token')
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (
    username: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    // Use a local flag — do NOT touch the global isLoading so the layout
    // guard does not re-evaluate and cause a flash/redirect during login.
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      })

      const data = (await res.json()) as {
        token: string
        user: { id: string; fullName: string; role: UserRole; branch: string }
      }

      const userData: AuthUser = {
        id: data.user.id,
        username,
        fullName: data.user.fullName,
        role: data.user.role,
        branch: data.user.branch,
      }

      setToken(data.token)
      sessionStorage.setItem('auth_token', data.token)
      sessionStorage.setItem('auth_user', JSON.stringify(userData))
      setIsAuthenticated(true)
      setUser(userData)
      return { success: true }
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Invalid username or password'
      return { success: false, error: message }
    }
  }

  const logout = async (): Promise<void> => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Ignore logout errors — clear local state regardless
    }
    clearToken()
    sessionStorage.removeItem('auth_token')
    sessionStorage.removeItem('auth_user')
    setIsAuthenticated(false)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
