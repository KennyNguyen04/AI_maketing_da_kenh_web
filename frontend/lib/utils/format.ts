/**
 * Format a date string into Vietnamese locale format.
 * Example: "28 tháng 5, 2026"
 */
export function formatVietnameseDate(value: string) {
  const date = new Date(value)
  return `${date.getDate()} tháng ${date.getMonth() + 1}, ${date.getFullYear()}`
}
