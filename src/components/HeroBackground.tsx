import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * The atmospheric backdrop behind the hero.
 *
 * Built in four layers, each moving at its own rate so the scene has depth
 * rather than sliding as one flat picture:
 *
 *   1. two colour washes drifting on different periods
 *   2. an optional painted backdrop (`/illustrations/bg-hero.png`)
 *   3. an optional foreground silhouette (`/illustrations/bg-foreground.png`)
 *   4. lotus petals falling across everything
 *
 * Layers 2 and 3 are the generated artwork. They are *optional* on purpose —
 * the backdrop has to look finished before anyone drops a PNG in, so each one
 * mounts only once its file has actually loaded. A missing asset costs a 404
 * and nothing else.
 *
 * Parallax follows the scroll position only — the layers deliberately do not
 * track the cursor. It is driven by one rAF-throttled listener writing a CSS
 * custom property on a single element, so scrolling never triggers a React
 * render.
 */

const PETALS = 14

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Resolves once the image exists; `false` while it doesn't. */
function useAssetExists(src: string) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const image = new Image()
    image.onload = () => setReady(true)
    image.src = src
    return () => { image.onload = null }
  }, [src])
  return ready
}

export function HeroBackground({ className }: { className?: string }) {
  const root = useRef<HTMLDivElement>(null)
  const hasBackdrop = useAssetExists('/illustrations/bg-hero.png')
  const hasForeground = useAssetExists('/illustrations/bg-foreground.png')
  const hasPattern = useAssetExists('/illustrations/bg-pattern.png')

  useEffect(() => {
    const el = root.current
    if (!el || prefersReducedMotion()) return

    let frame = 0

    const paint = () => {
      frame = 0
      const rect = el.getBoundingClientRect()
      // 0 at the top of the section, 1 once it has scrolled a full height up.
      const progress = Math.min(1, Math.max(0, -rect.top / Math.max(rect.height, 1)))
      el.style.setProperty('--scroll', progress.toFixed(4))
    }

    const schedule = () => {
      // Coalesce every scroll into one write per frame.
      if (!frame) frame = requestAnimationFrame(paint)
    }

    paint()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule, { passive: true })
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [])

  return (
    <div
      ref={root}
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 -z-10 overflow-hidden [--scroll:0]',
        className,
      )}
    >
      {/* 1 — colour washes */}
      <div
        className="absolute -inset-[15%] opacity-70 blur-3xl motion-reduce:animate-none"
        style={{
          animation: 'bdg-drift-a 26s ease-in-out infinite',
          background:
            'radial-gradient(42% 46% at 28% 32%, color-mix(in oklab, var(--primary) 34%, transparent), transparent 70%)',
        }}
      />
      <div
        className="absolute -inset-[15%] opacity-60 blur-3xl motion-reduce:animate-none"
        style={{
          animation: 'bdg-drift-b 34s ease-in-out infinite',
          background:
            'radial-gradient(38% 42% at 74% 62%, color-mix(in oklab, var(--brand-gold) 30%, transparent), transparent 70%)',
        }}
      />

      {/* 2 — painted backdrop, the slowest-moving layer */}
      {hasBackdrop && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-[0.28] mix-blend-multiply"
          style={{
            backgroundImage: 'url(/illustrations/bg-hero.png)',
            transform:
              'translate3d(0, calc(var(--scroll) * -36px), 0) scale(1.06)',
          }}
        />
      )}

      {/* 2b — a seamless texture over everything above, to break up the flat
              gradient. Tiled, so it must be generated as a repeating pattern. */}
      {hasPattern && (
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'url(/illustrations/bg-pattern.png)',
            backgroundSize: '420px',
            transform: 'translate3d(0, calc(var(--scroll) * -18px), 0)',
          }}
        />
      )}

      {/* The readability wash sits here, *between* the scenery and the
          foreground. It fades to a solid background at the bottom, so anything
          painted after it stays crisp while everything behind it is muted —
          which is exactly the split between backdrop and foreground. */}
      <div className="absolute inset-0 bg-linear-to-b from-background/70 via-background/25 to-background" />

      {/* 3 — the silhouette band, read as a distant horizon rather than a
             foreground object.
             Painted through the artwork's alpha as a *mask* instead of being
             drawn as an image. Two reasons: dead black competed with the hero
             figure, which is also black, and a mask can be filled with any
             colour — here a warm brown drawn from the dunes, so the band
             belongs to the scene. The second mask layer fades the bottom out,
             which is what removes the hard black bar where the section ended.
             `mask-composite: intersect` keeps only what both masks agree on. */}
      {hasForeground && (
        <div
          className="absolute inset-x-0 bottom-0 h-[42%] opacity-70"
          style={{
            background:
              'linear-gradient(to bottom, #7A3B2A 0%, #93503A 55%, #A8674C 100%)',
            maskImage:
              'url(/illustrations/bg-foreground.png), linear-gradient(to bottom, #000 0%, #000 52%, transparent 94%)',
            WebkitMaskImage:
              'url(/illustrations/bg-foreground.png), linear-gradient(to bottom, #000 0%, #000 52%, transparent 94%)',
            maskSize: '100% auto, 100% 100%',
            WebkitMaskSize: '100% auto, 100% 100%',
            maskPosition: 'bottom, bottom',
            WebkitMaskPosition: 'bottom, bottom',
            maskRepeat: 'no-repeat, no-repeat',
            WebkitMaskRepeat: 'no-repeat, no-repeat',
            maskComposite: 'intersect',
            WebkitMaskComposite: 'source-in',
            transform:
              'translate3d(0, calc(var(--scroll) * 48px), 0)',
          }}
        />
      )}

      {/* 4 — petals drift in front of everything, including the foreground */}
      <Petals />
    </div>
  )
}

/**
 * Lotus petals drifting down the hero.
 *
 * The fall and the sway are two animations on two nested elements with
 * different, deliberately non-multiple durations, so the combined path takes
 * minutes to repeat instead of looping every few seconds.
 */
function Petals() {
  const petals = Array.from({ length: PETALS }, (_, i) => {
    // Deterministic pseudo-random: the same layout every render, no useMemo
    // and no hydration mismatch, but no visible grid either.
    const noise = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1
    return {
      id: i,
      left: noise(1) * 100,
      size: 8 + noise(2) * 11,
      fall: 16 + noise(3) * 16,
      sway: 4 + noise(4) * 5,
      delay: -noise(5) * 24,
      opacity: 0.14 + noise(6) * 0.2,
      gold: noise(7) > 0.82,
    }
  })

  return (
    <div className="absolute inset-0" data-petal>
      {petals.map((petal) => (
        <span
          key={petal.id}
          className="absolute top-0 block blur-[0.4px] will-change-transform"
          style={{
            left: `${petal.left}%`,
            animation: `bdg-petal-fall ${petal.fall}s linear ${petal.delay}s infinite`,
            ['--petal-opacity' as string]: petal.opacity,
          }}
        >
          <span
            className="block will-change-transform"
            style={{ animation: `bdg-petal-sway ${petal.sway}s ease-in-out ${petal.delay}s infinite` }}
          >
            <svg
              width={petal.size}
              height={petal.size}
              viewBox="0 0 24 24"
              fill="none"
              className={petal.gold ? 'text-brand-gold' : 'text-primary'}
            >
              {/* One lotus petal: a leaf shape with a crease down the middle. */}
              <path
                d="M12 1c5 5.4 7.4 10 7.4 13.6A7.4 7.4 0 0 1 12 23a7.4 7.4 0 0 1-7.4-8.4C4.6 11 7 6.4 12 1Z"
                fill="currentColor"
              />
              <path d="M12 4.5v15" stroke="white" strokeOpacity="0.35" strokeWidth="1" />
            </svg>
          </span>
        </span>
      ))}
    </div>
  )
}
