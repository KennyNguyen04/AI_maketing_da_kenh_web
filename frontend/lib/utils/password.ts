/**
 * Password strength validation.
 * Returns null if password meets all requirements, otherwise returns a user-facing error message.
 *
 * Requirements:
 * - At least 8 characters
 * - Contains at least one letter
 * - Contains at least one number
 */
export function validatePassword(password: string): string | null {
  if (!password || password.length < 8) {
    return 'Mật khẩu phải có ít nhất 8 ký tự / Password must be at least 8 characters'
  }
  if (!/[a-zA-Z]/.test(password)) {
    return 'Mật khẩu phải có ít nhất một chữ cái / Password must contain at least one letter'
  }
  if (!/[0-9]/.test(password)) {
    return 'Mật khẩu phải có ít nhất một chữ số / Password must contain at least one number'
  }
  return null
}

export function passwordStrength(password: string): 0 | 1 | 2 | 3 | 4 {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++
  return Math.min(4, score) as 0 | 1 | 2 | 3 | 4
}