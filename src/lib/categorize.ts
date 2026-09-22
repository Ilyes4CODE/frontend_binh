import type { CategoryCode } from '@/types'

const MINOR_AGE_LIMIT = 18

export function computeAge(birthDate: string, asOf: Date = new Date()): number {
  const [y, m, d] = birthDate.split('-').map(Number)
  let age = asOf.getFullYear() - y
  const beforeBirthdayThisYear = asOf.getMonth() + 1 < m || (asOf.getMonth() + 1 === m && asOf.getDate() < d)
  if (beforeBirthdayThisYear) age -= 1
  return age
}

export function computeCategory(age: number): CategoryCode {
  if (age < 9) return 'MINIBAD'
  if (age < 11) return 'POUSSIN'
  if (age < 13) return 'BENJAMIN'
  if (age < 15) return 'MINIME'
  if (age < 17) return 'CADET'
  if (age < 19) return 'JUNIOR'
  if (age <= 34) return 'SENIOR'
  return 'VETERAN'
}

export function computeIsMinor(age: number): boolean {
  return age < MINOR_AGE_LIMIT
}

export function categorize(birthDate: string) {
  const age = computeAge(birthDate)
  return { age, category: computeCategory(age), isMinor: computeIsMinor(age) }
}
