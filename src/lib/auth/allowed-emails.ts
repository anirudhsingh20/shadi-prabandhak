const raw = import.meta.env.VITE_ALLOWED_EMAILS ?? ''

export function getAllowedEmails(): string[] {
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export function isEmailAllowed(email: string): boolean {
  const allowed = getAllowedEmails()
  if (allowed.length === 0) {
    console.warn('VITE_ALLOWED_EMAILS is empty — all emails blocked')
    return false
  }
  return allowed.includes(email.trim().toLowerCase())
}
