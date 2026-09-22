import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GalleryPhoto } from '@/types'

const AUTOPLAY_MS = 5500

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

interface CarouselProps {
  photos: GalleryPhoto[]
  className?: string
}

/**
 * The landing-page photo carousel.
 *
 * Slides are stacked and cross-faded rather than translated in a strip: with a
 * strip, an RTL layout reverses the axis and the arrows end up driving it
 * backwards. A cross-fade has no axis, so Arabic and English behave the same.
 *
 * Autoplay stops on hover, on focus, and while the tab is hidden, and never
 * starts at all for a visitor who asked for reduced motion.
 */
export function Carousel({ photos, className }: CarouselProps) {
  const { t, i18n } = useTranslation()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const touchStart = useRef<number | null>(null)
  const count = photos.length

  const go = useCallback((next: number) => {
    if (count === 0) return
    // Wrap in both directions; the modulo of a negative is negative in JS.
    setIndex(((next % count) + count) % count)
  }, [count])

  const next = useCallback(() => go(index + 1), [go, index])
  const previous = useCallback(() => go(index - 1), [go, index])

  // A photo removed by the admin must not leave the index out of range.
  useEffect(() => {
    if (index >= count && count > 0) setIndex(0)
  }, [count, index])

  useEffect(() => {
    if (paused || count < 2 || prefersReducedMotion()) return
    const timer = window.setInterval(() => {
      // Skip the tick while the tab is in the background, otherwise a visitor
      // returns to a carousel that has silently raced through every slide.
      if (!document.hidden) setIndex((current) => (current + 1) % count)
    }, AUTOPLAY_MS)
    return () => window.clearInterval(timer)
  }, [paused, count])

  if (count === 0) return null

  const caption = (photo: GalleryPhoto) => {
    const byLanguage: Record<string, string> = {
      ar: photo.caption_ar,
      en: photo.caption_en,
      vi: photo.caption_vi,
    }
    return byLanguage[i18n.language] || photo.caption_en || photo.caption_ar || ''
  }

  return (
    <div
      className={cn(
        'group/carousel relative overflow-hidden rounded-2xl bg-muted shadow-lg',
        className,
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={(e) => { touchStart.current = e.touches[0].clientX }}
      onTouchEnd={(e) => {
        if (touchStart.current === null) return
        const delta = e.changedTouches[0].clientX - touchStart.current
        // A swipe follows the finger, so it flips with the writing direction.
        const forward = i18n.dir() === 'rtl' ? delta > 0 : delta < 0
        if (Math.abs(delta) > 45) (forward ? next : previous)()
        touchStart.current = null
      }}
      role="region"
      aria-roledescription="carousel"
      aria-label={t('home.galleryTitle')}
    >
      <div className="relative aspect-16/9 w-full">
        {photos.map((photo, i) => (
          <figure
            key={photo.id}
            className={cn(
              'absolute inset-0 transition-opacity duration-700 ease-out',
              i === index ? 'opacity-100' : 'pointer-events-none opacity-0',
            )}
            aria-hidden={i !== index}
          >
            <img
              src={photo.image_url}
              alt={caption(photo) || t('home.galleryTitle')}
              loading={i === 0 ? 'eager' : 'lazy'}
              className={cn(
                'size-full object-cover transition-transform duration-[6000ms] ease-out',
                // A slow drift on the active slide; still for reduced motion.
                i === index ? 'scale-105 motion-reduce:scale-100' : 'scale-100',
              )}
            />
            {caption(photo) && (
              <figcaption className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/75 to-transparent p-4 pt-10 text-sm font-medium text-white sm:p-6 sm:pt-14 sm:text-base">
                <bdi>{caption(photo)}</bdi>
              </figcaption>
            )}
          </figure>
        ))}
      </div>

      {count > 1 && (
        <>
          <ArrowButton side="start" onClick={previous} label={t('common.previous')} />
          <ArrowButton side="end" onClick={next} label={t('common.next')} />

          <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-2">
            {photos.map((photo, i) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => go(i)}
                aria-label={t('home.gallerySlide', { n: i + 1 })}
                aria-current={i === index}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  i === index ? 'w-6 bg-white' : 'w-1.5 bg-white/60 hover:bg-white/90',
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function ArrowButton({ side, onClick, label }: {
  side: 'start' | 'end'
  onClick: () => void
  label: string
}) {
  // Logical inset properties, so the arrows swap sides with the language and
  // the icon keeps pointing the way it actually moves.
  const Icon = side === 'start' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'absolute top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full',
        'bg-black/35 text-white opacity-0 backdrop-blur-sm transition',
        'hover:bg-black/60 focus-visible:opacity-100 group-hover/carousel:opacity-100',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
        side === 'start' ? 'start-3' : 'end-3',
      )}
    >
      <Icon className="size-5 rtl:rotate-180" />
    </button>
  )
}
