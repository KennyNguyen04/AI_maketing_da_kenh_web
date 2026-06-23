/**
 * POC Task 1 — Test URL Scraper
 * 
 * Mục đích: Kiểm tra xem @mozilla/readability + jsdom có extract được
 * nội dung chính từ các blog phổ biến hay không.
 * 
 * Tiêu chí Pass: ≥3/5 URL trích xuất được text có nghĩa (>100 từ)
 * 
 * Chạy: npm run test:scraper
 */

import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'

// ─── Test URLs ─────────────────────────────────────────────────────────────────
// 5 URL blog thực tế, đa dạng nguồn
const TEST_URLS = [
  {
    name: 'Viblo (tech blog VN)',
    url: 'https://viblo.asia/p/tong-hop-kien-thuc-javascript-can-biet-truoc-khi-hoc-reactjs-DZrGNNDdGVB',
  },
  {
    name: 'toidicodedao (blog VN)',
    url: 'https://toidicodedao.com/2023/07/18/su-that-ve-ai/',
  },
  {
    name: 'Substack',
    url: 'https://newsletter.pragmaticengineer.com/p/what-is-old-is-new-again',
  },
  {
    name: 'Dev.to',
    url: 'https://dev.to/t/javascript',
  },
  {
    name: 'Blog cá nhân (Overreacted - Dan Abramov)',
    url: 'https://overreacted.io/a-complete-guide-to-useeffect/',
  },
]

// ─── Scraper Function ──────────────────────────────────────────────────────────

async function scrapeURL(url) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000) // 15s timeout

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`)
    }

    const html = await response.text()
    const dom = new JSDOM(html, { url })
    const reader = new Readability(dom.window.document)
    const article = reader.parse()

    if (!article || !article.textContent) {
      return { success: false, error: 'Readability could not parse article', wordCount: 0, title: null }
    }

    // Clean up text
    const cleanText = article.textContent
      .replace(/\s+/g, ' ')
      .trim()
    
    const wordCount = cleanText.split(/\s+/).length

    return {
      success: wordCount > 100,
      title: article.title,
      wordCount,
      excerpt: cleanText.substring(0, 200) + '...',
      fullTextLength: cleanText.length,
    }
  } catch (error) {
    return {
      success: false,
      error: error.message || String(error),
      wordCount: 0,
      title: null,
    }
  } finally {
    clearTimeout(timeout)
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗')
  console.log('║         POC Task 1 — URL Scraper Test                      ║')
  console.log('║         Tiêu chí Pass: ≥3/5 URL extract được >100 từ       ║')
  console.log('╚══════════════════════════════════════════════════════════════╝')
  console.log()

  const results = []

  for (const testCase of TEST_URLS) {
    console.log(`🔍 Testing: ${testCase.name}`)
    console.log(`   URL: ${testCase.url}`)
    
    const startTime = Date.now()
    const result = await scrapeURL(testCase.url)
    const elapsed = Date.now() - startTime

    results.push({ ...testCase, ...result, elapsed })

    if (result.success) {
      console.log(`   ✅ PASS — ${result.wordCount} từ, ${elapsed}ms`)
      console.log(`   📄 Title: ${result.title}`)
      console.log(`   📝 Excerpt: ${result.excerpt}`)
    } else {
      console.log(`   ❌ FAIL — ${result.error || `Chỉ ${result.wordCount} từ`}, ${elapsed}ms`)
    }
    console.log()
  }

  // ─── Summary ──────────────────────────────────────────────────────────────────
  const passCount = results.filter(r => r.success).length
  const totalCount = results.length

  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`KẾT QUẢ: ${passCount}/${totalCount} URL extract thành công`)
  console.log()

  console.log('┌──────────────────────────────────┬────────┬──────────┬─────────┐')
  console.log('│ Nguồn                            │ Status │ Số từ    │ Time    │')
  console.log('├──────────────────────────────────┼────────┼──────────┼─────────┤')
  for (const r of results) {
    const name = r.name.padEnd(32)
    const status = r.success ? '✅ PASS' : '❌ FAIL'
    const words = String(r.wordCount).padStart(6)
    const time = `${r.elapsed}ms`.padStart(7)
    console.log(`│ ${name} │ ${status} │ ${words}   │ ${time} │`)
  }
  console.log('└──────────────────────────────────┴────────┴──────────┴─────────┘')
  console.log()

  if (passCount >= 3) {
    console.log('🎉 QUYẾT ĐỊNH: PASS — Giữ tính năng URL scraping trong sản phẩm.')
    console.log('   → Build API /api/brand-vault/analyze-url trong Module 2')
  } else {
    console.log('⚠️  QUYẾT ĐỊNH: FAIL — Chỉ dùng Paste Text, bỏ tính năng URL.')
    console.log('   → Giảm scope: chỉ cần /api/brand-vault/analyze-text')
  }

  // Save results to file
  const reportContent = JSON.stringify({ 
    timestamp: new Date().toISOString(),
    passCount, 
    totalCount, 
    decision: passCount >= 3 ? 'KEEP_URL_FEATURE' : 'DROP_URL_FEATURE',
    results 
  }, null, 2)
  
  const fs = await import('fs')
  fs.writeFileSync('poc-results-scraper.json', reportContent)
  console.log('\n📁 Kết quả chi tiết đã lưu vào: poc-results-scraper.json')
}

main().catch(console.error)
