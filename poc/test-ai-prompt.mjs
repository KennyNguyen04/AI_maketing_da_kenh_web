/**
 * POC Task 2 — Test AI Prompt phân tích giọng văn
 * 
 * Mục đích: Kiểm tra Gemini Flash-Lite và DeepSeek v3 có trả về 
 * JSON hợp lệ theo voice_profile schema hay không.
 * 
 * Trước khi chạy:
 *   1. Tạo file .env trong thư mục poc/ với nội dung:
 *      GOOGLE_AI_API_KEY=your_key_here
 *      DEEPSEEK_API_KEY=your_key_here
 *   2. Hoặc set biến môi trường trực tiếp:
 *      $env:GOOGLE_AI_API_KEY="your_key"; $env:DEEPSEEK_API_KEY="your_key"
 * 
 * Chạy: npm run test:ai
 */

import { GoogleGenAI } from '@google/genai'
import OpenAI from 'openai'
import fs from 'fs'

// ─── Load .env nếu có ──────────────────────────────────────────────────────────
try {
  const envContent = fs.readFileSync('.env', 'utf-8')
  for (const line of envContent.split('\n')) {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length) {
      process.env[key.trim()] = valueParts.join('=').trim()
    }
  }
} catch { /* no .env file, that's ok */ }

// ─── Config ─────────────────────────────────────────────────────────────────────
const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY

// ─── Voice Analysis Prompt (from masterplan) ────────────────────────────────────
const VOICE_ANALYSIS_PROMPT = `Phân tích giọng văn của đoạn văn bản sau.
Chỉ trả về JSON theo đúng schema dưới đây, không thêm bất kỳ text nào khác.
Không bọc trong markdown code block. Trả về raw JSON.

Schema:
{
  "tone": ["mảng tính từ mô tả giọng văn, tối đa 5"],
  "sentence_style": "short | medium | long | varied",
  "avg_sentence_length": <số từ trung bình mỗi câu>,
  "signature_phrases": ["cụm từ hay xuất hiện, tối đa 5"],
  "topics": ["chủ đề chính, tối đa 5"],
  "avoid": ["điều AI nên tránh khi viết theo giọng này, tối đa 4"]
}

Văn bản cần phân tích:
`

// ─── Test Samples ───────────────────────────────────────────────────────────────
const TEST_SAMPLES = [
  {
    name: 'Phong cách kỹ thuật - trực tiếp',
    text: `Sau 6 tháng tự mình gánh mọi thứ từ code đến marketing, tôi rút ra 3 bài học đắt giá.

Thứ nhất: Marketing không thể để cuối tuần. Tôi đã làm vậy và hậu quả là tăng trưởng bị chậm lại rõ rệt vào tháng thứ 3. Không phải sản phẩm tệ — mà là không ai biết nó tồn tại.

Thứ hai: Giọng văn nhất quán quan trọng hơn tần suất. Tôi từng post mỗi ngày nhưng content chất lượng thấp, về sau post 3 lần/tuần nhưng có chiều sâu — engagement tăng 40%.

Thứ ba: Tái chế nội dung thông minh. Một bài blog tốt có thể thành 5-7 post mạng xã hội nếu biết cách phân tách. Thực ra là đây là đòn bẩy content mạnh nhất tôi tìm ra.

Nói thẳng ra: nếu bạn đang build sản phẩm mà không làm marketing song song, bạn đang tự hại mình.`,
  },
  {
    name: 'Phong cách kể chuyện - gần gũi',
    text: `Hồi mới nghỉ việc ở công ty lớn để ra làm riêng, mình nghĩ đơn giản lắm. Code xong, đẩy lên, rồi mọi người sẽ tìm đến.

Nhưng thực tế phũ phàng hơn nhiều 😅

Tháng đầu tiên: 0 users. Tháng thứ hai: 2 users (mà 1 là bạn mình). Tháng thứ ba: mình bắt đầu hoảng.

Rồi mình nhận ra điều này: sản phẩm tốt không tự bán được. Bạn phải kể câu chuyện của nó. Bạn phải cho người ta lý do để quan tâm.

Mình bắt đầu viết — mỗi tuần 2-3 bài, không phải về "tính năng mới" mà về hành trình thật. Những thất bại, những bài học, những suy nghĩ lúc 2 giờ sáng.

Kết quả? Sau 2 tháng, traffic tăng 300%. Không phải vì SEO hay ads — mà vì mọi người chia sẻ câu chuyện thật.

Bài học lớn nhất: authenticity beats perfection. Mỗi lần.`,
  },
  {
    name: 'Phong cách học thuật - chuyên sâu (English)',
    text: `The fundamental challenge in building AI-powered content tools isn't the model quality — it's the prompt engineering for voice consistency.

Most AI writing assistants produce generic output because they lack persistent context about the user's writing style. Each session starts from zero. The result: content that reads like it was written by GPT, not by you.

Our approach at Amplify differs in three key ways:

First, we extract a structured voice profile from the user's existing content. This isn't a simple "tone" dropdown — we analyze sentence length distribution, signature phrases, topic clusters, and rhetorical patterns.

Second, we cache this profile as a system prompt that persists across sessions. The AI doesn't need to "learn" your voice each time. It remembers.

Third, we optimize output per channel. A LinkedIn post has different constraints than a tweet. Our channel-specific templates ensure format compliance while maintaining voice consistency.

The technical implementation uses a JSON-based voice profile schema with six dimensions: tone, sentence_style, avg_sentence_length, signature_phrases, topics, and avoid patterns. This schema is compact enough to fit within standard context windows while being expressive enough to capture meaningful style differences.`,
  },
]

// ─── Expected JSON Schema Validator ─────────────────────────────────────────────
function validateVoiceProfile(json) {
  const errors = []

  if (!json || typeof json !== 'object') {
    return { valid: false, errors: ['Not a valid JSON object'] }
  }

  // Required fields
  const requiredFields = ['tone', 'sentence_style', 'avg_sentence_length', 'signature_phrases', 'topics', 'avoid']
  for (const field of requiredFields) {
    if (!(field in json)) {
      errors.push(`Missing field: ${field}`)
    }
  }

  // Type checks
  if (json.tone && !Array.isArray(json.tone)) errors.push('tone should be an array')
  if (json.tone && json.tone.length > 5) errors.push(`tone has ${json.tone.length} items (max 5)`)

  const validStyles = ['short', 'medium', 'long', 'varied']
  if (json.sentence_style && !validStyles.includes(json.sentence_style)) {
    errors.push(`sentence_style "${json.sentence_style}" not in [${validStyles}]`)
  }

  if (json.avg_sentence_length && typeof json.avg_sentence_length !== 'number') {
    errors.push('avg_sentence_length should be a number')
  }

  if (json.signature_phrases && !Array.isArray(json.signature_phrases)) errors.push('signature_phrases should be an array')
  if (json.signature_phrases && json.signature_phrases.length > 5) errors.push(`signature_phrases has ${json.signature_phrases.length} items (max 5)`)

  if (json.topics && !Array.isArray(json.topics)) errors.push('topics should be an array')
  if (json.topics && json.topics.length > 5) errors.push(`topics has ${json.topics.length} items (max 5)`)

  if (json.avoid && !Array.isArray(json.avoid)) errors.push('avoid should be an array')
  if (json.avoid && json.avoid.length > 4) errors.push(`avoid has ${json.avoid.length} items (max 4)`)

  return { valid: errors.length === 0, errors }
}

// ─── Clean JSON from response ───────────────────────────────────────────────────
function extractJSON(text) {
  // Try to extract JSON from markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim()
  }
  // Try raw JSON
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    return jsonMatch[0].trim()
  }
  return text.trim()
}

// ─── Test Gemini ────────────────────────────────────────────────────────────────
async function testGemini(sampleText) {
  if (!GOOGLE_AI_API_KEY) return { error: 'GOOGLE_AI_API_KEY not set', skipped: true }

  try {
    const ai = new GoogleGenAI({ apiKey: GOOGLE_AI_API_KEY })
    const startTime = Date.now()

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: VOICE_ANALYSIS_PROMPT + sampleText,
    })

    const elapsed = Date.now() - startTime
    const rawText = response.text
    const cleanedJSON = extractJSON(rawText)

    try {
      const parsed = JSON.parse(cleanedJSON)
      const validation = validateVoiceProfile(parsed)
      return {
        success: true,
        jsonValid: true,
        schemaValid: validation.valid,
        schemaErrors: validation.errors,
        parsed,
        elapsed,
        rawResponse: rawText.substring(0, 500),
      }
    } catch (parseError) {
      return {
        success: true,
        jsonValid: false,
        parseError: parseError.message,
        elapsed,
        rawResponse: rawText.substring(0, 500),
      }
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// ─── Test DeepSeek ──────────────────────────────────────────────────────────────
async function testDeepSeek(sampleText) {
  if (!DEEPSEEK_API_KEY) return { error: 'DEEPSEEK_API_KEY not set', skipped: true }

  try {
    const openai = new OpenAI({
      apiKey: DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com',
    })

    const startTime = Date.now()

    const completion = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'Bạn là AI chuyên phân tích giọng văn. Chỉ trả về JSON, không thêm text nào khác.',
        },
        {
          role: 'user',
          content: VOICE_ANALYSIS_PROMPT + sampleText,
        },
      ],
      temperature: 0.3,
      max_tokens: 1024,
    })

    const elapsed = Date.now() - startTime
    const rawText = completion.choices[0]?.message?.content || ''
    const cleanedJSON = extractJSON(rawText)

    try {
      const parsed = JSON.parse(cleanedJSON)
      const validation = validateVoiceProfile(parsed)
      return {
        success: true,
        jsonValid: true,
        schemaValid: validation.valid,
        schemaErrors: validation.errors,
        parsed,
        elapsed,
        rawResponse: rawText.substring(0, 500),
        usage: completion.usage,
      }
    } catch (parseError) {
      return {
        success: true,
        jsonValid: false,
        parseError: parseError.message,
        elapsed,
        rawResponse: rawText.substring(0, 500),
      }
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗')
  console.log('║     POC Task 2 — AI Voice Analysis Prompt Test             ║')
  console.log('║     Test: Gemini Flash-Lite + DeepSeek v3                  ║')
  console.log('╚══════════════════════════════════════════════════════════════╝')
  console.log()

  if (!GOOGLE_AI_API_KEY && !DEEPSEEK_API_KEY) {
    console.error('❌ Không tìm thấy API key nào!')
    console.error('')
    console.error('Cách set API keys:')
    console.error('  Option 1: Tạo file .env trong thư mục poc/')
    console.error('    GOOGLE_AI_API_KEY=your_gemini_key')
    console.error('    DEEPSEEK_API_KEY=your_deepseek_key')
    console.error('')
    console.error('  Option 2: Set biến môi trường (PowerShell)')
    console.error('    $env:GOOGLE_AI_API_KEY="your_key"')
    console.error('    $env:DEEPSEEK_API_KEY="your_key"')
    process.exit(1)
  }

  const allResults = { gemini: [], deepseek: [], timestamp: new Date().toISOString() }

  for (const sample of TEST_SAMPLES) {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`📝 Sample: ${sample.name}`)
    console.log(`   (${sample.text.split(/\s+/).length} từ)`)
    console.log()

    // ── Gemini ──
    console.log('  🔵 Gemini 2.0 Flash-Lite:')
    const geminiResult = await testGemini(sample.text)
    allResults.gemini.push({ sample: sample.name, ...geminiResult })

    if (geminiResult.skipped) {
      console.log('     ⏭️  Skipped (no API key)')
    } else if (!geminiResult.success) {
      console.log(`     ❌ API Error: ${geminiResult.error}`)
    } else if (!geminiResult.jsonValid) {
      console.log(`     ❌ JSON Parse Error: ${geminiResult.parseError}`)
      console.log(`     Raw: ${geminiResult.rawResponse}`)
    } else {
      console.log(`     ✅ JSON Valid: Yes`)
      console.log(`     ${geminiResult.schemaValid ? '✅' : '⚠️'} Schema Valid: ${geminiResult.schemaValid ? 'Yes' : 'No'}`)
      if (geminiResult.schemaErrors.length > 0) {
        console.log(`     Schema issues: ${geminiResult.schemaErrors.join(', ')}`)
      }
      console.log(`     ⏱️  Time: ${geminiResult.elapsed}ms`)
      console.log(`     📊 Tone: ${JSON.stringify(geminiResult.parsed.tone)}`)
      console.log(`     📊 Style: ${geminiResult.parsed.sentence_style} (~${geminiResult.parsed.avg_sentence_length} words/sentence)`)
      console.log(`     📊 Phrases: ${JSON.stringify(geminiResult.parsed.signature_phrases)}`)
    }
    console.log()

    // ── DeepSeek ──
    console.log('  🟢 DeepSeek v3:')
    const deepseekResult = await testDeepSeek(sample.text)
    allResults.deepseek.push({ sample: sample.name, ...deepseekResult })

    if (deepseekResult.skipped) {
      console.log('     ⏭️  Skipped (no API key)')
    } else if (!deepseekResult.success) {
      console.log(`     ❌ API Error: ${deepseekResult.error}`)
    } else if (!deepseekResult.jsonValid) {
      console.log(`     ❌ JSON Parse Error: ${deepseekResult.parseError}`)
      console.log(`     Raw: ${deepseekResult.rawResponse}`)
    } else {
      console.log(`     ✅ JSON Valid: Yes`)
      console.log(`     ${deepseekResult.schemaValid ? '✅' : '⚠️'} Schema Valid: ${deepseekResult.schemaValid ? 'Yes' : 'No'}`)
      if (deepseekResult.schemaErrors.length > 0) {
        console.log(`     Schema issues: ${deepseekResult.schemaErrors.join(', ')}`)
      }
      console.log(`     ⏱️  Time: ${deepseekResult.elapsed}ms`)
      console.log(`     📊 Tone: ${JSON.stringify(deepseekResult.parsed.tone)}`)
      console.log(`     📊 Style: ${deepseekResult.parsed.sentence_style} (~${deepseekResult.parsed.avg_sentence_length} words/sentence)`)
      console.log(`     📊 Phrases: ${JSON.stringify(deepseekResult.parsed.signature_phrases)}`)
      if (deepseekResult.usage) {
        console.log(`     💰 Tokens: ${deepseekResult.usage.prompt_tokens} in / ${deepseekResult.usage.completion_tokens} out`)
      }
    }
    console.log()
  }

  // ─── Summary ──────────────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('TỔNG KẾT')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log()

  for (const provider of ['gemini', 'deepseek']) {
    const results = allResults[provider]
    const label = provider === 'gemini' ? '🔵 Gemini Flash-Lite' : '🟢 DeepSeek v3'
    
    const total = results.filter(r => !r.skipped).length
    const jsonValid = results.filter(r => r.jsonValid).length
    const schemaValid = results.filter(r => r.schemaValid).length
    const avgTime = results.filter(r => r.elapsed).reduce((sum, r) => sum + r.elapsed, 0) / (results.filter(r => r.elapsed).length || 1)

    console.log(`${label}:`)
    if (total === 0) {
      console.log('  ⏭️  Skipped (no API key)')
    } else {
      console.log(`  JSON parse thành công: ${jsonValid}/${total}`)
      console.log(`  Schema hợp lệ:        ${schemaValid}/${total}`)
      console.log(`  Thời gian TB:          ${Math.round(avgTime)}ms`)
      
      if (jsonValid === total && schemaValid === total) {
        console.log(`  → ✅ STABLE — Dùng ngay, không cần retry logic`)
      } else if (jsonValid === total) {
        console.log(`  → ⚠️  JSON OK nhưng schema có vấn đề — Cần thêm validation`)
      } else {
        console.log(`  → ❌ UNSTABLE — Cần thêm retry + JSON repair logic`)
      }
    }
    console.log()
  }

  // ─── Decision Table ──────────────────────────────────────────────────────────
  console.log('┌─────────────────────────┬──────────────┬────────────────────────────────┐')
  console.log('│ Quyết định              │ Kết quả POC  │ Hành động                      │')
  console.log('├─────────────────────────┼──────────────┼────────────────────────────────┤')

  const geminiStable = allResults.gemini.filter(r => r.jsonValid && r.schemaValid).length
  const geminiTotal = allResults.gemini.filter(r => !r.skipped).length
  const geminiDecision = geminiTotal === 0 ? 'Skipped' : (geminiStable === geminiTotal ? 'Stable' : 'Unstable')
  const geminiAction = geminiTotal === 0 ? 'Cần API key'
    : (geminiStable === geminiTotal ? 'Dùng ngay' : 'Thêm retry logic')
  console.log(`│ Gemini Prompt JSON      │ ${geminiDecision.padEnd(12)} │ ${geminiAction.padEnd(30)} │`)

  const deepseekStable = allResults.deepseek.filter(r => r.jsonValid && r.schemaValid).length
  const deepseekTotal = allResults.deepseek.filter(r => !r.skipped).length
  const deepseekDecision = deepseekTotal === 0 ? 'Skipped' : (deepseekStable === deepseekTotal ? 'Stable' : 'Unstable')
  const deepseekAction = deepseekTotal === 0 ? 'Cần API key'
    : (deepseekStable === deepseekTotal ? 'Đủ tốt cho fallback' : 'Cần điều chỉnh')
  console.log(`│ DeepSeek Prompt JSON    │ ${deepseekDecision.padEnd(12)} │ ${deepseekAction.padEnd(30)} │`)
  console.log('└─────────────────────────┴──────────────┴────────────────────────────────┘')

  // Save full results
  fs.writeFileSync('poc-results-ai.json', JSON.stringify(allResults, null, 2))
  console.log('\n📁 Kết quả chi tiết đã lưu vào: poc-results-ai.json')
}

main().catch(console.error)
