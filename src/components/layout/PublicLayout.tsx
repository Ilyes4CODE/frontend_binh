import { Link, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { SectionBackground } from '@/components/SectionBackground'
import { Button } from '@/components/ui/button'

export function PublicLayout() {
  const { t } = useTranslation()
  const location = useLocation()

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt={t('common.clubName')} className="size-10 rounded-full" />
            <div className="hidden flex-col sm:flex">
              <span className="text-sm font-bold leading-tight">{t('common.clubName')}</span>
              <span className="text-xs leading-tight text-muted-foreground">{t('common.clubSubtitle')}</span>
            </div>
          </Link>
          <nav className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
            <Button asChild variant={location.pathname === '/' ? 'secondary' : 'ghost'} size="sm">
              <Link to="/">{t('nav.home')}</Link>
            </Button>
            <Button asChild variant={location.pathname === '/about' ? 'secondary' : 'ghost'} size="sm">
              <Link to="/about">{t('nav.about')}</Link>
            </Button>
            <Button
              asChild
              variant={location.pathname.startsWith('/community') ? 'secondary' : 'ghost'}
              size="sm"
            >
              <Link to="/community">{t('nav.community')}</Link>
            </Button>
            <Button asChild variant={location.pathname === '/register' ? 'default' : 'ghost'} size="sm">
              <Link to="/register">{t('nav.register')}</Link>
            </Button>
            <LanguageSwitcher />
          </nav>
        </div>
      </header>

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
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
