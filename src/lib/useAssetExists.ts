import { useEffect, useState } from 'react'

/**
 * Resolves to `true` once the image at `src` has actually loaded.
 *
 * Every decorative background on the site is optional: the page has to look
 * finished before anyone drops a PNG into /public/illustrations, and adding one
 * later must not require a code change. A missing asset costs one 404 and is
 * otherwise invisible.
 */
export function useAssetExists(src: string) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    const image = new Image()
    image.onload = () => { if (!cancelled) setReady(true) }
    image.src = src
    return () => {
      cancelled = true
      image.onload = null
    }
  }, [src])

  return ready
}
