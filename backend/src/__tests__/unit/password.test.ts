import { describe, expect, it } from 'vitest'
import { isStrongPassword, PASSWORD_REQUIREMENTS_MESSAGE } from '../../lib/password'

describe('isStrongPassword', () => {
  it('accepts passwords that meet all requirements', () => {
    expect(isStrongPassword('Abcdef1!')).toBe(true)
  })

  it('rejects passwords missing requirements', () => {
    expect(isStrongPassword('abcdef1!')).toBe(false) // no uppercase
    expect(isStrongPassword('ABCDEF1!')).toBe(false) // no lowercase
    expect(isStrongPassword('Abcdefg!')).toBe(false) // no number
    expect(isStrongPassword('Abcdef12')).toBe(false) // no special
    expect(isStrongPassword('Ab1!')).toBe(false) // too short
  })

  it('exports the required error message', () => {
    expect(PASSWORD_REQUIREMENTS_MESSAGE).toBe(
      'Password must be at least 8 characters with uppercase, lowercase, number, and special character.',
    )
  })
})
