// Small dependency-free validation helpers.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isEmail(s: string): boolean {
  return EMAIL_RE.test(s.trim())
}

// Loose check: optional leading +, 7–15 digits after stripping common separators.
export function isPhone(s: string): boolean {
  const digits = s.replace(/[\s\-().]/g, '')
  return /^\+?\d{7,15}$/.test(digits)
}

// Returns the integer when v is a whole number within [min, max], else null.
export function toIntInRange(v: unknown, min: number, max: number): number | null {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : typeof v === 'number' ? v : NaN
  if (!Number.isInteger(n) || n < min || n > max) return null
  return n
}

// Trims and caps a value at maxLen; non-strings become ''.
export function cleanStr(s: unknown, maxLen: number): string {
  if (typeof s !== 'string') return ''
  return s.trim().slice(0, maxLen)
}
