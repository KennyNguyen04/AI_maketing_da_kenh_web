/**
 * Resilient JSON parser for LLM outputs.
 * Handles markdown-wrapped JSON, extra text before/after JSON, and malformed outputs.
 */
export function cleanAndParseJson(text: string) {
  const trimmed = text.trim()
  
  // Try to find the JSON structure using outer braces (highly resilient)
  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const jsonCandidate = trimmed.substring(firstBrace, lastBrace + 1)
    try {
      return JSON.parse(jsonCandidate)
    } catch {
      console.warn('Failed parsing outer braces JSON candidate, fallback to regex. Text:', jsonCandidate)
    }
  }

  // Fallback to regex-based extraction (handles ```json ... ``` blocks)
  const jsonMatch = trimmed.match(/```(?:json)?\n([\s\S]*?)\n```/i) || trimmed.match(/```([\s\S]*?)```/i)
  const jsonString = jsonMatch ? jsonMatch[1] : trimmed
  
  return JSON.parse(jsonString)
}
