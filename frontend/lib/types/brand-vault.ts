export interface VoiceProfile {
  tone: string[]
  sentence_style: 'short' | 'medium' | 'long' | 'varied'
  avg_sentence_length: number
  signature_phrases: string[]
  topics: string[]
  avoid: string[]
}
