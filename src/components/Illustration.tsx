import { useState } from 'react'

interface IllustrationProps {
  src: string
  alt: string
  className?: string
}

/** Renders nothing (instead of a broken-image icon) until the asset actually exists at /public/illustrations. */
export function Illustration({ src, alt, className }: IllustrationProps) {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return <img src={src} alt={alt} className={className} loading="lazy" onError={() => setFailed(true)} />
}
