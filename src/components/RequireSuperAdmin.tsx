import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

/**
 * Route guards for the three levels. The API is what actually refuses these
 * screens — these only keep someone from landing on a page where every control
 * would fail, and send them back to their own dashboard instead.
 */

/** National administrator only: clubs, national accounts, required documents. */
export function RequireSuperAdmin() {
  const { user, isLoading } = useAuth()
  if (isLoading) return null
  if (!user?.is_super_admin) return <Navigate to="/admin" replace />
  return <Outlet />
}

/** National administrator or club president — not a branch manager:
 *  competitions, community, carousel, branches. */
export function RequireClubLevel() {
  const { user, isLoading } = useAuth()
  if (isLoading) return null
  if (!user || user.is_branch_manager) return <Navigate to="/admin" replace />
  return <Outlet />
}
