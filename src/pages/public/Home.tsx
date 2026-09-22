import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowRight, Award, CalendarClock, FileCheck2, Flower2, HandHeart, Lock, MessagesSquare, ShieldCheck, Users } from 'lucide-react'
import { api } from '@/lib/api'
import { CATEGORY_ORDER, type Feed, type GalleryPhoto, type SiteSettings } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Illustration } from '@/components/Illustration'
import { Reveal } from '@/components/Reveal'
import { Carousel } from '@/components/Carousel'
import { HeroBackground } from '@/components/HeroBackground'
import { BrushReveal } from '@/components/BrushReveal'
import { SectionBackground } from '@/components/SectionBackground'
import { PostCard } from '@/components/community/PostCard'

const YOUTH = ['JUNIOR', 'CADET', 'MINIME', 'BENJAMIN', 'POUSSIN', 'MINIBAD'] as const
const ADULTS = ['SENIOR', 'VETERAN'] as const

export default function Home() {
  const { t } = useTranslation()
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await api.get<SiteSettings>('/settings/')).data,
  })
  const { data: photos = [] } = useQuery({
    queryKey: ['gallery'],
    queryFn: async () => (await api.get<GalleryPhoto[]>('/gallery/')).data,
  })
  // Just the top few — the landing page is a teaser, /community is the feed.
  const { data: feed } = useQuery({
    queryKey: ['feed-preview'],
    queryFn: async () =>
      (await api.get<Feed>('/community/posts/', { params: { page_size: 3 } })).data,
  })
  const season = settings?.active_season ?? '2025/2026'
  const registrationsOpen = settings?.registrations_open ?? true

  return (
    <div>
      <section className="relative isolate overflow-hidden bg-linear-to-b from-secondary/70 to-background">
        <HeroBackground />
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-16 md:grid-cols-2 md:py-24">
          <div className="space-y-5 text-center md:text-start">
            <span className="inline-flex animate-in items-center gap-2 rounded-full bg-brand-gold px-3 py-1 text-xs font-semibold text-brand-gold-foreground fade-in slide-in-from-bottom-2 duration-500">
              <Flower2 className="size-3.5" />
              {t('common.season')} {season}
            </span>
            <BrushReveal
              as="h1"
              text={t('home.heroTitle')}
              delay={140}
              className="text-3xl font-extrabold tracking-tight text-balance md:text-5xl"
            />
            <p className="mx-auto max-w-xl animate-in text-base text-muted-foreground fade-in slide-in-from-bottom-3 duration-500 [animation-delay:160ms] [animation-fill-mode:backwards] md:mx-0 md:text-lg">
              {t('home.heroSubtitle', { season })}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-500 [animation-delay:240ms] [animation-fill-mode:backwards] md:justify-start">
              {registrationsOpen ? (
                <Button asChild size="lg">
                  <Link to="/register">
                    {t('home.ctaRegister')}
                    <ArrowRight className="size-4 transition-transform duration-200 group-hover/button:translate-x-0.5 rtl:rotate-180 rtl:group-hover/button:-translate-x-0.5" />
                  </Link>
                </Button>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-lg bg-muted px-4 py-2 text-sm font-semibold text-muted-foreground">
                  <Lock className="size-4" />
                  {t('register.closedTitle')}
                </span>
              )}
              <Button asChild size="lg" className="bg-brand-gold text-brand-gold-foreground hover:bg-brand-gold/90">
                <a href="#categories">{t('home.ctaLearnMore')}</a>
              </Button>
            </div>
          </div>

          <div className="flex animate-in items-center justify-center fade-in zoom-in-95 duration-700 [animation-delay:120ms] [animation-fill-mode:backwards]">
            <Illustration
              src="/illustrations/hero.png"
              alt={t('common.clubName')}
              className="w-full max-w-sm md:max-w-md"
            />
          </div>
        </div>
      </section>

      {photos.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-10">
          <Reveal className="mb-6 text-center">
            <h2 className="text-2xl font-bold">{t('home.galleryTitle')}</h2>
            <p className="mt-2 text-muted-foreground">{t('home.gallerySubtitle')}</p>
          </Reveal>
          <Reveal delay={100}>
            <Carousel photos={photos} />
          </Reveal>
        </section>
      )}

      <section className="relative isolate overflow-hidden">
        <SectionBackground asset="bg-about.png" variant="watermark" side="end" />
        <div className="mx-auto grid max-w-5xl items-center gap-8 px-4 py-14 md:grid-cols-2">
          <Reveal className="order-2 md:order-1">
            <Illustration src="/illustrations/about.png" alt={t('home.aboutTitle')} className="mx-auto w-full max-w-md" />
          </Reveal>
          <Reveal delay={100} className="order-1 text-center md:order-2 md:text-start">
            <h2 className="text-2xl font-bold">{t('home.aboutTitle')}</h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">{t('home.aboutBody')}</p>
          </Reveal>
        </div>
      </section>

      <section className="relative isolate overflow-hidden border-y border-border bg-muted/30 py-12">
        <SectionBackground asset="bg-values.png" variant="band" />
        <div className="mx-auto grid max-w-5xl gap-8 px-4 sm:grid-cols-2 md:grid-cols-4">
          <Reveal>
            <ValueItem icon={ShieldCheck} title={t('home.valueDisciplineTitle')} text={t('home.valueDisciplineBody')} />
          </Reveal>
          <Reveal delay={80}>
            <ValueItem icon={Flower2} title={t('home.valueRespectTitle')} text={t('home.valueRespectBody')} />
          </Reveal>
          <Reveal delay={160}>
            <ValueItem icon={Award} title={t('home.valueExcellenceTitle')} text={t('home.valueExcellenceBody')} />
          </Reveal>
          <Reveal delay={240}>
            <ValueItem icon={HandHeart} title={t('home.valueCommunityTitle')} text={t('home.valueCommunityBody')} />
          </Reveal>
        </div>
      </section>

      <section id="categories" className="relative isolate scroll-mt-20 overflow-hidden py-16">
        <SectionBackground asset="bg-categories.png" variant="bloom" />
        <div className="mx-auto max-w-5xl px-4">
          <Reveal className="mb-10 text-center">
            <h2 className="text-2xl font-bold">{t('home.categoriesTitle')}</h2>
            <p className="mt-2 text-muted-foreground">{t('home.categoriesSubtitle')}</p>
          </Reveal>

          <div className="grid items-start gap-6 md:grid-cols-2">
            <Reveal delay={80}>
              <CategoryPanel title={t('home.categoriesGroupYouth')} codes={YOUTH} icon={Users} />
            </Reveal>
            <Reveal delay={160}>
              <CategoryPanel title={t('home.categoriesGroupAdults')} codes={ADULTS} icon={Award} />
            </Reveal>
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden bg-muted/30 py-16">
        <SectionBackground asset="bg-fees.png" variant="texture" />
        <div className="mx-auto grid max-w-5xl gap-6 px-4 md:grid-cols-3">
          <Reveal>
            <InfoCard icon={FileCheck2} title={t('home.requirementsTitle')} text={t('home.requirementsBody')} />
          </Reveal>
          <Reveal delay={80}>
            <InfoCard
              icon={CalendarClock}
              title={t('home.offerGroupsTitle')}
              text={t('home.offerGroupsBody')}
            />
          </Reveal>
          <Reveal delay={160}>
            <InfoCard
              icon={Award}
              title={t('home.offerEventsTitle')}
              text={t('home.offerEventsBody')}
            />
          </Reveal>
        </div>
      </section>

      {feed && feed.results.length > 0 && (
        <section className="relative isolate overflow-hidden py-16">
          <SectionBackground asset="bg-community.png" variant="glow" />
          <div className="mx-auto max-w-5xl px-4">
            <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-2xl font-bold">
                  <MessagesSquare className="size-6 text-primary" />
                  {t('home.communityTitle')}
                </h2>
                <p className="mt-2 text-muted-foreground">{t('home.communitySubtitle')}</p>
              </div>
              <Button asChild variant="outline">
                <Link to="/community">
                  {t('home.communityCta')}
                  <ArrowRight className="size-4 rtl:rotate-180" />
                </Link>
              </Button>
            </Reveal>

            <div className="grid items-stretch gap-6 md:grid-cols-3">
              {feed.results.map((post, i) => (
                <Reveal key={post.slug} delay={i * 80} className="h-full">
                  {/* Read-only here: liking lives on the feed and the post page. */}
                  <PostCard post={post} onToggleLike={() => {}} pending />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="relative isolate overflow-hidden bg-primary py-14 text-center text-primary-foreground">
        <SectionBackground asset="bg-cta.png" variant="ink" />
        <Reveal>
          <h2 className="text-2xl font-bold">
            {registrationsOpen ? t('home.ctaRegister') : t('register.closedTitle')}
          </h2>
          {registrationsOpen && (
            <div className="mt-6">
              <Button asChild size="lg" className="bg-brand-gold text-brand-gold-foreground hover:bg-brand-gold/90">
                <Link to="/register">
                  {t('home.ctaRegister')}
                  <ArrowRight className="size-4 transition-transform duration-200 group-hover/button:translate-x-0.5 rtl:rotate-180 rtl:group-hover/button:-translate-x-0.5" />
                </Link>
              </Button>
            </div>
          )}
        </Reveal>
      </section>
    </div>
  )
}

function CategoryPanel({
  title,
  codes,
  icon: Icon,
}: {
  title: string
  codes: readonly (typeof CATEGORY_ORDER)[number][]
  icon: typeof Users
}) {
  const { t } = useTranslation()
  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-primary">
          <Icon className="size-4" />
          {title}
        </h3>
        <div className="space-y-2">
          {codes.map((code) => (
            <div
              key={code}
              className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-4 py-3 transition-colors duration-200 hover:bg-secondary"
            >
              <span className="font-medium">{t(`categories.${code}`)}</span>
              <span className="shrink-0 rounded-full bg-brand-gold px-3 py-1 text-xs font-semibold text-brand-gold-foreground">
                {t(`categories.${code}_range`)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ValueItem({ icon: Icon, title, text }: { icon: typeof ShieldCheck; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-secondary">
        <Icon className="size-5 text-primary" />
      </span>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  )
}

function InfoCard({
  icon: Icon,
  title,
  text,
  highlight,
}: {
  icon: typeof FileCheck2
  title: string
  text: string
  highlight?: boolean
}) {
  return (
    <Card className="h-full transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="flex h-full flex-col items-center gap-3 p-6 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-secondary">
          <Icon className="size-5 text-primary" />
        </span>
        <h3 className="font-semibold">{title}</h3>
        {/* dir=ltr keeps "1000 DA" from being reordered to "DA 1000" inside the RTL layout */}
        <p dir={highlight ? 'ltr' : undefined} className={highlight ? 'text-xl font-bold text-primary' : 'text-sm text-muted-foreground'}>
          {text}
        </p>
      </CardContent>
    </Card>
  )
}
