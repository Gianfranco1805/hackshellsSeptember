const PHONE_PATTERN = /^[0-9+\-()\s]{7,}$/

export function isValidPhone(value: string): boolean {
  return PHONE_PATTERN.test(value.trim())
}
