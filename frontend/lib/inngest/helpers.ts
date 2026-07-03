/**
 * Helper utilities for Inngest workers.
 */

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

/**
 * Validate URL to prevent SSRF attacks.
 * - Only http/https schemes
 * - Block private/internal IP ranges (loopback, link-local, private RFC1918, etc.)
 * - Block IPv6 internal ranges
 * - Block non-standard ports on http (force 80/443 for public sites)
 */
export function validatePublicUrl(url: string): URL {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('Invalid URL format')
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw new Error(`URL scheme "${parsed.protocol}" is not allowed. Only http: and https: are permitted.`)
  }

  const hostname = parsed.hostname.toLowerCase()

  // Block IPv4-mapped addresses and well-known internal hostnames
  const blockedHostnames = new Set([
    'localhost',
    'metadata.google.internal',
    'metadata',
  ])
  if (blockedHostnames.has(hostname)) {
    throw new Error('URL points to an internal/reserved host and is not allowed')
  }

  // Block IPv4 addresses in private/reserved ranges
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
  const ipv4Match = hostname.match(ipv4Regex)
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number)
    const isPrivate =
      a === 10 || // 10.0.0.0/8
      a === 127 || // 127.0.0.0/8 (loopback)
      (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
      (a === 192 && b === 168) || // 192.168.0.0/16
      (a === 169 && b === 254) || // 169.254.0.0/16 (link-local, AWS metadata)
      a === 0 // 0.0.0.0/8
    if (isPrivate) {
      throw new Error('URL points to a private/internal IP range and is not allowed')
    }
  }

  // Block IPv6 internal ranges (loopback, link-local, unique-local, etc.)
  if (hostname.includes(':')) {
    const normalized = hostname.split('%')[0] // strip zone identifier
    const isInternalIPv6 =
      normalized === '::1' ||
      normalized === '::' ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      normalized.startsWith('fe80:') ||
      normalized.startsWith('127.') ||
      normalized === '[::ffff:7f00:1]' // IPv4-mapped loopback
    if (isInternalIPv6) {
      throw new Error('URL points to an internal IPv6 address and is not allowed')
    }
  }

  return parsed
}

/**
 * Extract main text content from a URL using jsdom & @mozilla/readability.
 * Returns cleaned text limited to 5000 words.
 *
 * Safeguards against e-commerce / JS-heavy pages:
 * - Hard cap HTML response at 1MB (was 5MB) — most article content fits comfortably
 * - Reject obvious product/listing patterns early to avoid 15-min Readability hangs
 * - Wrap JSDOM parse in a race-with-timeout to fail fast instead of hanging
 */
const MAX_HTML_BYTES = 1_000_000
const JSDOM_PARSE_TIMEOUT_MS = 8_000

// E-commerce patterns that almost always break @mozilla/readability:
//   - product detail pages (huge inline JSON, hydration scripts, variant carousels)
//   - category/listing pages (infinite scroll, hundreds of cards)
// We detect via path keywords + a small JSON-LD sniff. This is conservative —
// false positives (rejecting a legit blog post) are rare and recoverable via
// the text input flow.
const ECOMMERCE_PATH_PATTERNS = [
  /\/product\//i,
  /\/products\//i,
  /\/p\//i,
  /\/item\//i,
  /\/dp\//i,            // Amazon-style
  /\/collections?\/[^\/]+$/i, // shopify "collections/X"
  /\/c\//i,
  /\/catalog\//i,
  /\/category\//i,
]

function looksLikeEcommerce(urlObj: URL, html: string): boolean {
  if (ECOMMERCE_PATH_PATTERNS.some((re) => re.test(urlObj.pathname))) return true
  const lower = html.toLowerCase()
  if (lower.includes('"@type":"product"')) return true
  if (lower.includes('"@type":"itempage"')) return true
  if (lower.includes('addtocart') || lower.includes('add_to_cart') || lower.includes('add-to-cart')) return true
  return false
}

export async function extractTextFromUrl(url: string) {
  // SSRF defense: validate URL before any network request
  const validatedUrl = validatePublicUrl(url)

  const { JSDOM } = await import('jsdom')
  const { Readability } = await import('@mozilla/readability')

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15_000)

  let response: Response
  try {
    response = await fetch(validatedUrl.toString(), {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    })
  } catch (err) {
    clearTimeout(timeoutId)
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timed out after 15 seconds')
    }
    throw new Error(`Failed to fetch URL: ${err instanceof Error ? err.message : String(err)}`)
  } finally {
    clearTimeout(timeoutId)
  }

  // Re-validate after redirects (the final URL must also be public)
  if (response.url) {
    try {
      validatePublicUrl(response.url)
    } catch {
      throw new Error('Redirected to an internal/reserved URL — request blocked')
    }
  }

  if (response.status === 403 || response.status === 429) {
    throw new Error(`Website blocked access (HTTP ${response.status}). Try a different URL.`)
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: HTTP ${response.status}`)
  }

  const contentLength = response.headers.get('content-length')
  if (contentLength && parseInt(contentLength, 10) > MAX_HTML_BYTES) {
    throw new Error(
      `URL response too large (>${Math.round(MAX_HTML_BYTES / 1024)}KB). This page is likely too heavy for static analysis — try copying the text directly.`,
    )
  }

  const html = await response.text()

  if (html.length > MAX_HTML_BYTES) {
    throw new Error(
      `URL response too large (>${Math.round(MAX_HTML_BYTES / 1024)}KB). This page is likely too heavy for static analysis — try copying the text directly.`,
    )
  }

  // Early reject obvious e-commerce / product pages to avoid hanging in
  // Readability (known issue on carousels + hydration-heavy pages).
  if (looksLikeEcommerce(validatedUrl, html)) {
    throw new Error(
      'This looks like a product or catalog page, which our static analyzer cannot reliably parse. Please copy the page text directly and use the "Paste text" option instead.',
    )
  }

  // Race JSDOM parse + Readability against a wall-clock timeout. Readability
  // is known to hang for minutes on pages with deeply nested carousels.
  // The `unknown` annotations avoid TS narrowing the variables to `never`
  // after we capture the result of `Readability.parse()` (whose return type
  // is `null | { ... }` and triggers unwanted narrowing under --strictNullChecks).
  let article: unknown = null
  let parseError: unknown = null
  const parseFinished: Promise<void> = (async () => {
    try {
      const dom = new JSDOM(html, { url: validatedUrl.toString() })
      const reader = new Readability(dom.window.document)
      article = reader.parse()
    } catch (err) {
      parseError = err
    }
  })()

  const parseTimeout: Promise<void> = new Promise<void>((resolve) =>
    setTimeout(() => resolve(), JSDOM_PARSE_TIMEOUT_MS),
  )
  await Promise.race([parseFinished, parseTimeout])

  if (parseError) {
    const errMsg = parseError instanceof Error ? parseError.message : String(parseError)
    throw new Error(`Failed to parse page content: ${errMsg}`)
  }
  const articleObj = article as { textContent?: string | null } | null
  if (!articleObj || !articleObj.textContent) {
    throw new Error(
      'Could not extract readable content from this page. The article might require JavaScript or login. Please copy the text directly and use the "Paste text" option instead.',
    )
  }

  const cleanText = articleObj.textContent!.replace(/\s+/g, ' ').trim()
  const words = cleanText.split(/\s+/)
  if (words.length > 5000) {
    return words.slice(0, 5000).join(' ')
  }
  return cleanText
}
