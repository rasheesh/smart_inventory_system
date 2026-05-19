export const PASSWORD_REQUIREMENTS_MESSAGE =
  'Password must be at least 8 characters with uppercase, lowercase, number, and special character.'

export const PASSWORD_SAME_AS_BEFORE_MESSAGE =
  'New password must be different from the current password.'

/** At least 8 chars with uppercase, lowercase, digit, and special character. */
export function isValidPassword(password: string): boolean {
  if (password.length < 8) return false
  if (!/[A-Z]/.test(password)) return false
  if (!/[a-z]/.test(password)) return false
  if (!/\d/.test(password)) return false
  if (!/[^A-Za-z0-9]/.test(password)) return false
  return true
}
