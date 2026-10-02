import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { useTranslation } from 'react-i18next'
import { Direction } from 'radix-ui'
import './index.css'
import { RTL_LANGUAGES } from './i18n'
import App from './App.tsx'
import { ConfirmProvider } from './components/ConfirmDialog'

/**
 * Tells the Radix components which way the page reads.
 *
 * Setting dir on <html> is enough for CSS, but not for Radix: each primitive
 * writes its own dir attribute and defaults to "ltr" unless given one here. In
 * Arabic that laid every select, dropdown and tab bar out left to right — the
 * arrow on the wrong side, a long branch name truncated at its first words
 * instead of its last, and the arrow keys moving the wrong way.
 */
function RadixDirection({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? i18n.language
  const dir = RTL_LANGUAGES.includes(language) ? 'rtl' : 'ltr'
  return <Direction.DirectionProvider dir={dir}>{children}</Direction.DirectionProvider>
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RadixDirection>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </RadixDirection>
  </StrictMode>,
)
