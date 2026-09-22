import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Building2, CalendarClock, GitBranch, History, Images, LayoutDashboard, ListChecks, LogOut, Menu, MessagesSquare, Settings, Swords, UserCog, Users } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

export function AdminLayout() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  // Close the phone menu once a destination is chosen.
  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  const isSuperAdmin = user?.is_super_admin ?? false
  const isBranchManager = user?.is_branch_manager ?? false

  // Each level sees the screens that belong to it. A branch manager's world is
  // one branch's candidates, groups and history; club-wide and national screens
  // are not theirs. (The API refuses them too — this only keeps the menu honest.)
  const links = [
    { to: '/admin', end: true, label: t('admin.dashboard'), icon: LayoutDashboard },
    { to: '/admin/registrations', end: false, label: t('admin.registrations'), icon: Users },
    { to: '/admin/groups', end: false, label: t('org.groups'), icon: CalendarClock },
    ...(!isBranchManager
      ? [
          { to: '/admin/branches', end: false, label: t('hier.branches'), icon: GitBranch },
          { to: '/admin/competitions', end: false, label: t('comp.title'), icon: Swords },
          { to: '/admin/community', end: false, label: t('admin.posts'), icon: MessagesSquare },
          { to: '/admin/gallery', end: false, label: t('admin.gallery'), icon: Images },
        ]
      : []),
    ...(isSuperAdmin
      ? [
          { to: '/admin/clubs', end: false, label: t('org.clubs'), icon: Building2 },
          { to: '/admin/users', end: false, label: t('org.users'), icon: UserCog },
          { to: '/admin/document-fields', end: false, label: t('admin.documentFields'), icon: ListChecks },
        ]
      : []),
    { to: '/admin/activity', end: false, label: t('hier.activity'), icon: History },
    { to: '/admin/settings', end: false, label: t('admin.settings'), icon: Settings },
  ]

  // Who is signed in, in words: "National administrator", "President — Ouargla
  // Club", "Khafji — Ouargla Club".
  const scopeLabel = !user
    ? ''
    : user.is_super_admin
      ? t('hier.roleNational')
      : user.is_branch_manager
        ? `${t('hier.roleBranch')} — ${user.center_name ?? ''}`
        : `${t('hier.rolePresident')} — ${user.club_name ?? ''}`

  const navList = (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {links.map(({ to, end, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground/80 hover:bg-muted hover:text-foreground',
            )
          }
        >
          <Icon className="size-4" />
          {label}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-64 shrink-0 border-e border-border bg-background md:flex md:flex-col">
        <Link to="/admin" className="flex items-center gap-3 border-b border-border px-5 py-4">
          <img src="/logo.png" alt={t('common.clubName')} className="size-9 rounded-full" />
          <div className="flex flex-col">
            <span className="text-sm font-bold leading-tight">{t('common.clubName')}</span>
            <span className="text-xs text-muted-foreground">{t('admin.dashboard')}</span>
          </div>
        </Link>
        {navList}
        <div className="border-t border-border p-3">
          <Button variant="ghost" className="w-full justify-start gap-3" onClick={logout}>
            <LogOut className="size-4" />
            {t('admin.logout')}
          </Button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-2 border-b border-border bg-background px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label={t('hier.menu')}
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="size-5" />
            </Button>
            <span className="hidden truncate text-muted-foreground sm:inline">{user?.username}</span>
            {user && (
              <span className="truncate rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                <bdi>{scopeLabel}</bdi>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" className="md:hidden" onClick={logout}>
              <LogOut className="size-4" />
            </Button>
          </div>
        </header>
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="border-b border-border px-5 py-4">
              <SheetTitle className="flex items-center gap-3 text-start">
                <img src="/logo.png" alt="" className="size-8 rounded-full" />
                {t('common.clubName')}
              </SheetTitle>
            </SheetHeader>
            {navList}
            <div className="border-t border-border p-3">
              <Button variant="ghost" className="w-full justify-start gap-3" onClick={logout}>
                <LogOut className="size-4" />
                {t('admin.logout')}
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
