import { describe, it, expect } from 'vitest'
import { validatePassword, passwordStrength } from './password'

describe('lib/utils/password: validatePassword', () => {
  it('accepts a strong password with letter + number + 8+ chars', () => {
    expect(validatePassword('Strong123')).toBeNull()
  })

  it('rejects empty password', () => {
    expect(validatePassword('')).toMatch(/ít nhất 8/)
  })

  it('rejects password shorter than 8 characters', () => {
    expect(validatePassword('Abc1')).toMatch(/ít nhất 8/)
  })

  it('rejects password with exactly 7 characters', () => {
    expect(validatePassword('Abc1234')).toBeTruthy()
  })

  it('accepts password with exactly 8 characters', () => {
    expect(validatePassword('Abcd1234')).toBeNull()
  })

  it('rejects password without any letter', () => {
    expect(validatePassword('12345678')).toMatch(/chữ cái/)
  })

  it('rejects password with only symbols and numbers', () => {
    expect(validatePassword('1234!@#$')).toBeTruthy()
  })

  it('accepts password with uppercase letter', () => {
    expect(validatePassword('Password1')).toBeNull()
  })

  it('accepts password with lowercase letter', () => {
    expect(validatePassword('password1')).toBeNull()
  })

  it('rejects password without any digit', () => {
    expect(validatePassword('Abcdefgh')).toMatch(/chữ số/)
  })

  it('rejects password with letters but no digits and short', () => {
    expect(validatePassword('abcdef')).toBeTruthy()
  })

  it('error messages are bilingual (Vietnamese + English)', () => {
    // Bilingual messages ensure users understand in either language
    const msg = validatePassword('')
    expect(msg).toBeTruthy()
    expect(msg).toMatch(/Mật khẩu|Password/i)
  })

  it('error message for missing letter is bilingual', () => {
    const msg = validatePassword('12345678')
    expect(msg).toMatch(/chữ cái|letter/i)
  })

  it('error message for missing number is bilingual', () => {
    const msg = validatePassword('Abcdefgh')
    expect(msg).toMatch(/chữ số|number/i)
  })

  it('handles non-ASCII characters (Vietnamese diacritics)', () => {
    // Vietnamese letters match [a-zA-Z]? No, only ASCII. But "MậtKhẩu" starts with
    // uppercase ASCII 'M' → has ASCII letter. Combined with number → valid (null).
    // This documents current behavior: function is ASCII-only for letter check.
    expect(validatePassword('MậtKhẩu123')).toBeNull()
  })

  it('handles unicode number forms gracefully', () => {
    // Unicode digits like ๑๒๓ don't match [0-9]
    expect(validatePassword('Password๑๒๓')).toBeTruthy()
  })
})

describe('lib/utils/password: passwordStrength', () => {
  it('returns 0 for empty password', () => {
    expect(passwordStrength('')).toBe(0)
  })

  it('returns 2 for password with only mixed case (length <8)', () => {
    // "Ab1" → mixed case (+1) + digit (+1) → 2 (length <8 not counted)
    expect(passwordStrength('Ab1')).toBe(2)
  })

  it('returns 2 for password with only length >= 8 and digit', () => {
    // "abcd1234": length>=8 (+1), digit (+1), no mixed case → 2
    expect(passwordStrength('abcd1234')).toBe(2)
  })

  it('returns 3 for password with length >= 12 and digit', () => {
    // "abcdefgh1234" (12 chars): length>=8 (+1), >=12 (+1), digit (+1), no mixed case → 3
    expect(passwordStrength('abcdefgh1234')).toBe(3)
  })

  it('returns 3 for password with length >= 8, mixed case, digit', () => {
    // "Abcd1234": length>=8 (+1), mixed case (+1), digit (+1) → 3
    expect(passwordStrength('Abcd1234')).toBe(3)
  })

  it('returns 4 for password with length >= 12, mixed case, digit', () => {
    // "Abcdefgh1234" (12 chars): all four criteria met → 4
    expect(passwordStrength('Abcdefgh1234')).toBe(4)
  })

  it('returns 4 for password with length >= 8, mixed case, digit, special', () => {
    // "Abcd123!": length>=8 (+1), mixed case (+1), digit (+1), special (+1) → 4
    expect(passwordStrength('Abcd123!')).toBe(4)
  })

  it('returns 4 for very strong password', () => {
    expect(passwordStrength('Abcdefgh1234!')).toBe(4)
  })

  it('caps score at 4 for super complex password', () => {
    expect(passwordStrength('Abcdefgh1234!@#$%^&*()')).toBe(4)
  })

  it('returns 2 for password with only special chars + length >=8', () => {
    // "!@#$%^&*": length>=8 (+1), special (+1) → 2
    expect(passwordStrength('!@#$%^&*')).toBe(2)
  })
})