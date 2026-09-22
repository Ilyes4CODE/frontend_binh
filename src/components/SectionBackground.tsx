import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useAssetExists } from '@/lib/useAssetExists'

/**
 * Decorative artwork behind one landing-page section.
 *
 * Every section gets a *different* kind of movement. A page where each band
 * drifts identically reads as a template, so the variants below deliberately
 * differ in both what they draw and how they move:
 *
 *   watermark — a large mark pinned to one side, breathing in place
 *   band      — an ornamental strip sliding sideways, forever
 *   bloom     — a centred mark opening outward once, then holding
 *   texture   — a still tiled surface with a soft vignette
 *   glow      — two light fields crossing at different rates
 *   ink       — a single brush sweep across the band, played once
 *   ridge     — a silhouette easing up along the bottom edge
 *
 * Everything is optional and everything is inert: the layer mounts only once
 * its PNG has loaded, it is aria-hidden, and it never accepts pointer events.
 * The one-shot variants (`bloom`, `ink`, `ridge`) wait for the section to
 * scroll into view so the animation is actually seen rather than played to an
 * empty screen.
 */

export type SectionVariant =
  | 'watermark'
  | 'band'
  | 'bloom'
  | 'texture'
  | 'glow'
  | 'ink'
  | 'ridge'

interface SectionBackgroundProps {
  /** File in /public/illustrations, e.g. "bg-about.png". */
  asset: string
  variant: SectionVariant
  /** Which side a `watermark` hugs. Ignored by the other variants. */
  side?: 'start' | 'end'
  className?: string
}

const ONE_SHOT: SectionVariant[] = ['bloom', 'ink', 'ridge']

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function SectionBackground({
  asset,
  variant,
  side = 'end',
  className,
}: SectionBackgroundProps) {
  const { i18n } = useTranslation()
  const src = `/illustrations/${asset}`
  const ready = useAssetExists(src)
  const root = useRef<HTMLDivElement>(null)
  const [seen, setSeen] = useState(() => prefersReducedMotion())

  useEffect(() => {
    if (!ONE_SHOT.includes(variant)) return
    const el = root.current
    if (!el || prefersReducedMotion()) { setSeen(true); return }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [variant, ready])

  if (!ready) return null

  const rtl = i18n.dir() === 'rtl'

  return (
    <div
      ref={root}
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 -z-10 overflow-hidden', className)}
    >
      {variant === 'watermark' && (
        <div
          data-section-bg
          className={cn(
            'absolute -top-[10%] h-[120%] w-[56%] bg-contain bg-center bg-no-repeat opacity-[0.06]',
            side === 'end' ? '-end-[8%]' : '-start-[8%]',
          )}
          style={{
            backgroundImage: `url(${src})`,
            animation: 'bdg-watermark-float 24s ease-in-out infinite',
            ['--rest-opacity' as string]: 0.06,
          }}
        />
      )}

      {variant === 'band' && (
        <>
          {/* Top and bottom rails slide in opposite directions, so the eye
              reads movement without either rail looking like it is scrolling
              the page. */}
          <div
            data-section-bg
            className="absolute inset-x-0 top-0 h-10 opacity-[0.12]"
            style={{
              backgroundImage: `url(${src})`,
              backgroundSize: '480px auto',
              backgroundRepeat: 'repeat-x',
              animation: 'bdg-band-slide 48s linear infinite',
              ['--rest-opacity' as string]: 0.12,
            }}
          />
          <div
            data-section-bg
            className="absolute inset-x-0 bottom-0 h-10 opacity-[0.12]"
            style={{
              backgroundImage: `url(${src})`,
              backgroundSize: '480px auto',
              backgroundRepeat: 'repeat-x',
              animation: 'bdg-band-slide-reverse 60s linear infinite',
              ['--rest-opacity' as string]: 0.12,
            }}
          />
        </>
      )}

      {variant === 'bloom' && (
        <div
          data-section-bg
          className="absolute left-1/2 top-1/2 aspect-square w-[min(90%,720px)] -translate-x-1/2 -translate-y-1/2 bg-contain bg-center bg-no-repeat opacity-[0.05]"
          style={{
            backgroundImage: `url(${src})`,
            // Opens once when it scrolls in, then holds with a slow breath.
            animation: seen
              ? 'bdg-bloom-in 1100ms cubic-bezier(0.22, 1, 0.36, 1) both, bdg-bloom-breathe 18s ease-in-out 1100ms infinite'
              : 'none',
            opacity: seen ? 0.05 : 0,
            ['--rest-opacity' as string]: 0.05,
          }}
        />
      )}

      {variant === 'texture' && (
        <>
          <div
            data-section-bg
            className="absolute inset-0 opacity-[0.10]"
            style={{
              backgroundImage: `url(${src})`,
              backgroundSize: '360px',
              ['--rest-opacity' as string]: 0.1,
            }}
          />
          {/* Pulls the eye back to the middle of the band. */}
          <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_50%,transparent,var(--background))]" />
        </>
      )}

      {variant === 'glow' && (
        <>
          <div
            data-section-bg
            className="absolute -inset-[20%] bg-cover bg-center opacity-[0.16] blur-2xl"
            style={{
              backgroundImage: `url(${src})`,
              animation: 'bdg-glow-a 30s ease-in-out infinite',
              ['--rest-opacity' as string]: 0.16,
            }}
          />
          <div
            data-section-bg
            className="absolute -inset-[20%] scale-x-[-1] bg-cover bg-center opacity-[0.12] blur-3xl"
            style={{
              backgroundImage: `url(${src})`,
              animation: 'bdg-glow-b 40s ease-in-out infinite',
              ['--rest-opacity' as string]: 0.12,
            }}
          />
        </>
      )}

      {variant === 'ink' && (
        <div
          data-section-bg
          className="absolute inset-0 bg-cover bg-center opacity-[0.18] mix-blend-overlay"
          style={{
            backgroundImage: `url(${src})`,
            // The sweep follows the writing direction.
            animation: seen
              ? `${rtl ? 'bdg-ink-wipe-rtl' : 'bdg-ink-wipe'} 1500ms cubic-bezier(0.65, 0, 0.35, 1) both`
              : 'none',
            opacity: seen ? 0.18 : 0,
            ['--rest-opacity' as string]: 0.18,
          }}
        />
      )}

      {variant === 'ridge' && (
        /* Anchored to the BOTTOM, not the top. Pinned to the top edge the dune
           mass hangs down across the footer text; sitting on the bottom edge it
           reads as ground under the content, which is what a horizon is for. */
        <div
          data-section-bg
          className="absolute inset-x-0 bottom-0 h-16 bg-[length:100%_auto] bg-bottom bg-no-repeat opacity-[0.16]"
          style={{
            backgroundImage: `url(${src})`,
            animation: seen ? 'bdg-ridge-rise 900ms cubic-bezier(0.22, 1, 0.36, 1) both' : 'none',
            opacity: seen ? 0.16 : 0,
            ['--rest-opacity' as string]: 0.16,
          }}
        />
      )}
    </div>
  )
}
