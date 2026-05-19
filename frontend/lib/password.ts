export const PASSWORD_REQUIREMENTS_MESSAGE =
  'Password must be at least 8 characters with uppercase, lowercase, number, and special character.'

export const PASSWORD_UNCHANGED_MESSAGE =
  'New password must be different from the current password.'

export function isStrongPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  )
}
