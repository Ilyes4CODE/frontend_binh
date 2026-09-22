import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowRight, Award, Flower2, GraduationCap, ScrollText, Swords, Users } from 'lucide-react'
import { api } from '@/lib/api'
import type { GalleryPhoto } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Carousel } from '@/components/Carousel'
import { Illustration } from '@/components/Illustration'
import { Reveal } from '@/components/Reveal'

export default function About() {
  const { t } = useTranslation()
  const { data: photos = [] } = useQuery({
    queryKey: ['gallery'],
    queryFn: async () => (await api.get<GalleryPhoto[]>('/gallery/')).data,
  })

  return (
    <div>
      <section className="bg-linear-to-b from-secondary/70 to-background">
        <div className="mx-auto max-w-4xl px-4 py-14 text-center md:py-20">
          <span className="inline-flex animate-in items-center gap-2 rounded-full bg-brand-gold px-3 py-1 text-xs font-semibold text-brand-gold-foreground fade-in slide-in-from-bottom-2 duration-500">
            <Flower2 className="size-3.5" />
            {t('common.clubName')}
          </span>
          <h1 className="mt-5 animate-in text-3xl font-extrabold tracking-tight text-balance fade-in slide-in-from-bottom-3 duration-500 [animation-delay:80ms] [animation-fill-mode:backwards] md:text-5xl">
            {t('about.title')}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl animate-in text-base text-muted-foreground leading-relaxed fade-in slide-in-from-bottom-3 duration-500 [animation-delay:160ms] [animation-fill-mode:backwards] md:text-lg">
            {t('about.lead')}
          </p>
        </div>
      </section>

      {photos.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 pb-4">
          <Reveal>
            <Carousel photos={photos} />
          </Reveal>
        </section>
      )}

      <section className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-14 md:grid-cols-2">
        <Reveal className="order-2 md:order-1">
          <Illustration
            src="/illustrations/about.png"
            alt={t('about.historyTitle')}
            className="mx-auto w-full max-w-md"
          />
        </Reveal>
        <Reveal delay={100} className="order-1 space-y-4 md:order-2">
          <SectionHeading icon={ScrollText} title={t('about.historyTitle')} />
          <p className="text-muted-foreground leading-relaxed">{t('about.historyBody')}</p>
        </Reveal>
      </section>

      <section className="border-y border-border bg-muted/30 py-14">
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 md:grid-cols-2">
          <Reveal className="space-y-4">
            <SectionHeading icon={Swords} title={t('about.disciplineTitle')} />
            <p className="text-muted-foreground leading-relaxed">{t('about.disciplineBody')}</p>
          </Reveal>
          <Reveal delay={100}>
            <Illustration
              src="/illustrations/hero.png"
              alt={t('about.disciplineTitle')}
              className="mx-auto w-full max-w-md"
            />
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14">
        <Reveal className="mb-8 text-center">
          <SectionHeading icon={GraduationCap} title={t('about.offerTitle')} centered />
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground leading-relaxed">
            {t('about.offerBody')}
          </p>
        </Reveal>

        <div className="grid gap-6 sm:grid-cols-3">
          <Reveal>
            <Pillar icon={Users} title={t('home.valueCommunityTitle')} text={t('home.valueCommunityBody')} />
          </Reveal>
          <Reveal delay={80}>
            <Pillar icon={Award} title={t('home.valueExcellenceTitle')} text={t('home.valueExcellenceBody')} />
          </Reveal>
          <Reveal delay={160}>
            <Pillar icon={Flower2} title={t('home.valueRespectTitle')} text={t('home.valueRespectBody')} />
          </Reveal>
        </div>
      </section>

      <section className="bg-primary py-14 text-center text-primary-foreground">
        <Reveal className="mx-auto max-w-2xl px-4">
          <h2 className="text-2xl font-bold">{t('about.joinTitle')}</h2>
          <p className="mt-3 text-primary-foreground/85 leading-relaxed">{t('about.joinBody')}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link to="/register">
                {t('about.ctaRegister')}
                <ArrowRight className="size-4 rtl:rotate-180" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              className="bg-brand-gold text-brand-gold-foreground hover:bg-brand-gold/90"
            >
              <Link to="/community">{t('about.ctaCommunity')}</Link>
            </Button>
          </div>
        </Reveal>
      </section>
    </div>
  )
}

function SectionHeading({ icon: Icon, title, centered }: {
  icon: typeof Users
  title: string
  centered?: boolean
}) {
  return (
    <h2 className={`flex items-center gap-3 text-2xl font-bold ${centered ? 'justify-center' : ''}`}>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
        <Icon className="size-5" />
      </span>
      {title}
    </h2>
  )
}

function Pillar({ icon: Icon, title, text }: { icon: typeof Users; title: string; text: string }) {
  return (
    <Card className="h-full transition-shadow duration-300 hover:shadow-md">
      <CardContent className="space-y-2 p-6">
        <Icon className="size-6 text-primary" />
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
      </CardContent>
    </Card>
  )
}
