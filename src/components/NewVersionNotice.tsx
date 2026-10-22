import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

const CHECK_EVERY_MS = 10 * 60 * 1000

/** The build this tab is running: the hashed bundle its page loaded. */
function runningBundle(): string | null {
  const script = document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/index-"]')
  return script ? new URL(script.src, location.href).pathname : null
}

/** The build the server is handing out now. */
async function deployedBundle(): Promise<string | null> {
  const response = await fetch(`/?version-check=${Date.now()}`, { cache: 'no-store' })
  if (!response.ok) return null
  return (await response.text()).match(/\/assets\/index-[\w-]+\.js/)?.[0] ?? null
}

/**
 * Offers a reload when a new version has been deployed while this tab was open.
 *
 * A tab left open across a deploy goes on running the old code against the
 * new server — which is how requests the server no longer accepts kept being
 * sent, and failed, on a computer nobody had refreshed. It checks when the tab
 * comes back into view and every ten minutes, and never reloads on its own:
 * a half-filled registration form must not be thrown away.
 */
export function NewVersionNotice() {
  const { t } = useTranslation()
  const told = useRef(false)

  useEffect(() => {
    const running = runningBundle()
    // The dev server has no hashed bundle, and nothing to compare.
    if (!running) return

    let cancelled = false
    const check = async () => {
      if (told.current || document.visibilityState !== 'visible') return
      try {
        const deployed = await deployedBundle()
        if (cancelled || !deployed || deployed === running) return
        told.current = true
        toast.info(t('app.newVersion'), {
          duration: Infinity,
          action: { label: t('app.reload'), onClick: () => location.reload() },
        })
      } catch {
        // Offline for a moment: try again at the next check.
      }
    }

    const timer = window.setInterval(check, CHECK_EVERY_MS)
    document.addEventListener('visibilitychange', check)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', check)
    }
  }, [t])

  return null
}
