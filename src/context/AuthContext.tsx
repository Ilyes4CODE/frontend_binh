import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, tokenStorage } from '@/lib/api'

export type Role = 'SUPER_ADMIN' | 'CLUB_OWNER' | 'BRANCH_MANAGER'

export interface AdminUser {
  username: string
  email: string
  role: Role
  /** National administrator — all of Algeria. */
  is_super_admin: boolean
  /** Club president — their club and every branch in it. */
  is_club_owner: boolean
  /** Branch manager — one branch (فرع) only. */
  is_branch_manager: boolean
  club: number | null
  club_name: string | null
  club_name_ar: string | null
  center: number | null
  center_name: string | null
  center_name_ar: string | null
  full_name: string
}

interface AuthContextValue {
  user: AdminUser | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get<AdminUser>('/auth/me/')
      setUser(data)
    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tokenStorage.getAccess()) {
      fetchMe()
    } else {
      setIsLoading(false)
    }
  }, [fetchMe])

  const login = useCallback(async (username: string, password: string) => {
    const { data } = await api.post('/auth/token/', { username, password })
    tokenStorage.set(data.access, data.refresh)
    await fetchMe()
  }, [fetchMe])

  const logout = useCallback(() => {
    tokenStorage.clear()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
