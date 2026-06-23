/**
 * Helper utilities for Inngest workers.
 */

/**
 * Extract main text content from a URL using jsdom & @mozilla/readability.
 * Returns cleaned text limited to 5000 words.
 */
export async function extractTextFromUrl(url: string) {
  const { JSDOM } = await import('jsdom')
  const { Readability } = await import('@mozilla/readability')

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: HTTP ${response.status}`)
  }

  const html = await response.text()
  const dom = new JSDOM(html, { url })
  const reader = new Readability(dom.window.document)
  const article = reader.parse()

  if (!article || !article.textContent) {
    throw new Error('Could not parse article from URL')
  }

  // Limit to roughly first 5000 words to avoid hitting token limits
  const cleanText = article.textContent.replace(/\s+/g, ' ').trim()
  const words = cleanText.split(/\s+/)
  if (words.length > 5000) {
    return words.slice(0, 5000).join(' ')
  }
  return cleanText
}
