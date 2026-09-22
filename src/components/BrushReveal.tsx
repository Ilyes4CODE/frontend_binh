import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

/**
 * Reveals a headline word by word, as if each were painted with one brush
 * stroke: an ink bar sweeps across the word and the letters are wiped in
 * behind it.
 *
 * Deliberately not the fade-and-rise used everywhere else on the site — a
 * martial-arts school reads better with something closer to calligraphy, and
 * the hero should not animate like the cards below it.
 *
 * The stroke runs left-to-right in Latin and right-to-left in Arabic, so it
 * always travels the way the text is actually written.
 */

interface BrushRevealProps {
  text: string
  className?: string
  /** Delay before the first word, in ms. */
  delay?: number
  /** Gap between consecutive words, in ms. */
  stagger?: number
  as?: 'h1' | 'h2' | 'p' | 'span'
}

export function BrushReveal({
  text,
  className,
  delay = 0,
  stagger = 110,
  as: Tag = 'span',
}: BrushRevealProps) {
  const { i18n } = useTranslation()
  const rtl = i18n.dir() === 'rtl'
  const words = text.split(/\s+/).filter(Boolean)

  return (
    <Tag className={className}>
      {words.map((word, index) => {
        const start = delay + index * stagger
        return (
          // Two nested spans: the outer keeps normal inline layout and word
          // wrapping, the inner carries the clip so the stroke never affects
          // where the text sits.
          <span key={`${word}-${index}`} className="relative inline-block whitespace-pre">
            <span
              data-brush-word
              className="inline-block [animation-fill-mode:backwards]"
              style={{
                animation: `${rtl ? 'bdg-brush-in-rtl' : 'bdg-brush-in'} 520ms cubic-bezier(0.22, 1, 0.36, 1) ${start}ms both`,
              }}
            >
              {word}
            </span>
            <span
              aria-hidden="true"
              data-sheen
              className="absolute inset-y-[0.12em] start-0 w-full origin-left rounded-[2px] bg-primary/80 [animation-fill-mode:backwards]"
              style={{
                animation: `bdg-ink-sweep 620ms cubic-bezier(0.65, 0, 0.35, 1) ${start}ms both`,
                ['--ink-origin' as string]: rtl ? 'right' : 'left',
                ['--ink-end' as string]: rtl ? 'left' : 'right',
              }}
            />
            {index < words.length - 1 && ' '}
          </span>
        )
      })}
    </Tag>
  )
}

/**
 * A one-off sheen that crosses a panel the first time it is revealed.
 * Pairs with <Reveal> on section headings.
 */
export function Sheen({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      data-sheen
      className={cn(
        'pointer-events-none absolute inset-y-0 w-1/3 bg-linear-to-r from-transparent via-white/25 to-transparent',
        className,
      )}
      style={{ animation: 'bdg-sheen 1400ms ease-out 240ms both' }}
    />
  )
}
