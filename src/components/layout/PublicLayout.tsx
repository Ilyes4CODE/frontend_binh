import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu } from 'lucide-react'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { SectionBackground } from '@/components/SectionBackground'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

const LINKS = [
  { to: '/', key: 'nav.home', match: (p: string) => p === '/' },
  { to: '/about', key: 'nav.about', match: (p: string) => p === '/about' },
  { to: '/community', key: 'nav.community', match: (p: string) => p.startsWith('/community') },
  { to: '/register', key: 'nav.register', match: (p: string) => p === '/register' },
]

export function PublicLayout() {
  const { t } = useTranslation()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  // Navigating from inside the sheet has to close it, or the new page opens
  // underneath a panel that is still covering it.
  useEffect(() => setMenuOpen(false), [location.pathname])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4">
          <Link to="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
            <img src="/logo.png" alt={t('common.clubName')} className="size-9 shrink-0 rounded-full sm:size-10" />
            {/* The name used to be hidden below sm, which left a bare logo and
                no way to tell whose site this is. */}
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-bold leading-tight">{t('common.clubName')}</span>
              <span className="truncate text-xs leading-tight text-muted-foreground">
                {t('common.clubSubtitle')}
              </span>
            </div>
          </Link>

          {/* Four buttons plus the language switcher do not fit a phone. They
              used to wrap onto three rows of a sticky header, which then ate a
              fifth of the screen on every page. */}
          <nav className="hidden items-center gap-1 md:flex lg:gap-2">
            {LINKS.map(({ to, key, match }) => (
              <Button
                key={to}
                asChild
                size="sm"
                variant={
                  match(location.pathname)
                    ? to === '/register' ? 'default' : 'secondary'
                    : 'ghost'
                }
              >
                <Link to={to}>{t(key)}</Link>
              </Button>
            ))}
            <LanguageSwitcher />
          </nav>

          <div className="flex shrink-0 items-center gap-1 md:hidden">
            <LanguageSwitcher />
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('hier.menu')}
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="size-5" />
            </Button>
          </div>
        </div>
      </header>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="right" className="w-72 p-0">
          <SheetHeader className="border-b border-border px-5 py-4">
            <SheetTitle className="flex items-center gap-3 text-start">
              <img src="/logo.png" alt="" className="size-8 rounded-full" />
              {t('common.clubName')}
            </SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col p-3">
            {LINKS.map(({ to, key, match }) => (
              <Link
                key={to}
                to={to}
                className={`rounded-md px-3 py-3 text-sm font-medium transition-colors ${
                  match(location.pathname)
                    ? 'bg-secondary text-secondary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                {t(key)}
              </Link>
            ))}
          </nav>
          <div className="mt-auto border-t border-border p-3">
            <Link
              to="/admin/login"
              className="block rounded-md px-3 py-3 text-sm text-muted-foreground hover:bg-muted"
            >
              {t('nav.adminLogin')}
            </Link>
          </div>
        </SheetContent>
      </Sheet>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="relative isolate overflow-hidden border-t border-border bg-muted/40">
        <SectionBackground asset="bg-footer.png" variant="ridge" />
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-8 text-center sm:flex-row sm:justify-between sm:text-start">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt={t('common.clubName')} className="size-8 rounded-full" />
            <div>
              <p className="text-sm font-semibold">{t('common.clubName')}</p>
              <p className="text-xs text-muted-foreground">{t('common.clubSubtitle')}</p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground sm:flex-row sm:gap-4">
            <span>© {new Date().getFullYear()} {t('common.clubName')} — {t('home.footerRights')}</span>
            <Link to="/admin/login" className="underline underline-offset-2 hover:text-foreground">
              {t('nav.adminLogin')}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
