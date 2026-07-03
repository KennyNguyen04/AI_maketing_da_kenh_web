import { logEvent } from '@/lib/observability/logger'

/**
 * Resilient JSON parser for LLM outputs.
 * Handles markdown-wrapped JSON, extra text before/after JSON, and malformed outputs.
 *
 * Strategy (best to worst):
 *   1. Try direct JSON.parse on the trimmed text.
 *   2. Extract the LAST balanced JSON object (Gemini sometimes emits preamble + object).
 *   3. Strip markdown code fences ```json ... ``` or ``` ... ``` and parse.
 *   4. If still failing, attempt to repair truncated JSON by closing open braces/brackets/strings.
 */
export function cleanAndParseJson(text: string) {
  if (!text || !text.trim()) {
    throw new Error('Failed to parse AI response as JSON: empty input')
  }

  const trimmed = text.trim()

  // Strategy 1: direct parse
  try {
    return JSON.parse(trimmed)
  } catch {
    // fall through
  }

  // Strategy 2: extract balanced JSON object (LAST occurrence to skip any embedded objects
  // inside `system_prompt_cache` or similar string fields).
  const objectCandidate = extractLastBalancedJsonObject(trimmed)
  if (objectCandidate) {
    try {
      return JSON.parse(objectCandidate)
    } catch (err) {
      logEvent('ai.parser.balanced_object_failed', {
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  // Strategy 3: strip markdown code fences (greedy match across newlines)
  const fenceMatch = trimmed.match(/```(?:json|JSON)?\s*([\s\S]*?)```/m)
  if (fenceMatch) {
    const fenceBody = fenceMatch[1].trim()
    try {
      return JSON.parse(fenceBody)
    } catch {
      // try one more time inside fence using balanced extraction
      const nested = extractLastBalancedJsonObject(fenceBody)
      if (nested) {
        try {
          return JSON.parse(nested)
        } catch {
          // fall through to repair
        }
      }
    }
  }

  // Strategy 4: attempt to repair truncated JSON (Gemini hit maxTokens and cut off mid-string)
  const repaired = tryRepairTruncatedJson(trimmed)
  if (repaired) {
    try {
      return JSON.parse(repaired)
    } catch {
      // fall through
    }
  }

  throw new Error(
    `Failed to parse AI response as JSON: ${trimmed.slice(0, 200)}…`,
  )
}

/**
 * Find the last top-level balanced `{ ... }` JSON object in the text.
 * Tracks brace nesting while respecting strings (so braces inside "..." don't count)
 * and escape sequences.
 */
function extractLastBalancedJsonObject(text: string): string | null {
  let depth = 0
  let start = -1
  let lastValid = null
  let inString = false
  let escapeNext = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (inString) {
      if (escapeNext) {
        escapeNext = false
      } else if (ch === '\\') {
        escapeNext = true
      } else if (ch === '"') {
        inString = false
      }
      continue
    }

    if (ch === '"') {
      inString = true
      continue
    }

    if (ch === '{') {
      if (depth === 0) start = i
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0 && start !== -1) {
        lastValid = text.slice(start, i + 1)
        start = -1
      } else if (depth < 0) {
        // unmatched closing brace — reset and keep scanning
        depth = 0
        start = -1
      }
    }
  }

  return lastValid
}

/**
 * Attempt to close out any open JSON structures when the response was truncated
 * mid-token (common when Gemini hits maxOutputTokens). This is best-effort and
 * only triggers if the prefix already looks like JSON.
 */
function tryRepairTruncatedJson(text: string): string | null {
  // Look for the start of the LAST top-level object
  const lastOpen = text.lastIndexOf('{')
  if (lastOpen === -1) return null

  const prefix = text.slice(lastOpen)

  // If the prefix is already valid JSON, no repair needed (caller would have caught it)
  try {
    JSON.parse(prefix)
    return prefix
  } catch {
    // continue with repair
  }

  // Walk the prefix, tracking open braces / brackets / strings,
  // and append closing characters as needed.
  let depth = 0
  let inString = false
  let escapeNext = false
  const stack: Array<'}' | ']' | '"'> = []

  for (let i = 0; i < prefix.length; i++) {
    const ch = prefix[i]

    if (inString) {
      if (escapeNext) {
        escapeNext = false
      } else if (ch === '\\') {
        escapeNext = true
      } else if (ch === '"') {
        inString = false
        stack.pop() // closing string already accounted for
      }
      continue
    }

    if (ch === '"') {
      inString = true
      stack.push('"')
    } else if (ch === '{') {
      depth++
      stack.push('}')
    } else if (ch === '[') {
      depth++
      stack.push(']')
    } else if (ch === '}') {
      depth--
      stack.pop()
    } else if (ch === ']') {
      depth--
      stack.pop()
    }
  }

  if (depth <= 0 && stack.length === 0) {
    // Nothing to repair
    return null
  }

  // If we ended mid-string, close the string first
  let repaired = prefix
  if (inString) {
    // Drop any partial escape sequence at the very end
    if (repaired.endsWith('\\')) {
      repaired = repaired.slice(0, -1)
    }
    repaired += '"'
  }

  // Then close all open structures in reverse order
  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i] === '"') continue // already handled above
    repaired += stack[i]
  }

  return repaired
}
