import { GoogleGenAI } from '@google/genai'

const apiKey = process.env.GOOGLE_AI_API_KEY
if (!apiKey) {
  console.error('GOOGLE_AI_API_KEY not set')
  process.exit(1)
}

const ai = new GoogleGenAI({ apiKey })

const startedAt = Date.now()
try {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: 'hello gemini',
  })
  const elapsedMs = Date.now() - startedAt
  console.log(JSON.stringify({
    ok: true,
    model: 'gemini-2.5-flash',
    text: response.text,
    usage: response.usageMetadata,
    elapsedMs,
  }, null, 2))
} catch (error) {
  const elapsedMs = Date.now() - startedAt
  const message = error instanceof Error ? error.message : String(error)
  console.error(JSON.stringify({
    ok: false,
    error: message,
    elapsedMs,
  }, null, 2))
  process.exit(1)
}