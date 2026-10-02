import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Wrap a value in Unicode directional isolates (FSI … PDI) before putting it
 * into a translated sentence. An email address or a date inside Arabic text is
 * otherwise reordered by the bidi algorithm — "amine@example.dz, 1:08" came
 * out as "2 – 2026/10/amine@example.dz" — and a full stop after it jumps to
 * the wrong end of the line.
 */
export function isolate(value: string | null | undefined): string {
  return value ? `\u2068${value}\u2069` : ''
}
