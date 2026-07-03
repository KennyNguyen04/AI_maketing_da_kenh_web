import { describe, it, expect } from 'vitest'
import { cleanAndParseJson } from './parser'

describe('lib/ai/parser: cleanAndParseJson', () => {
  it('parses a plain valid JSON object', () => {
    const input = '{"title":"Hello","body":"World"}'
    expect(cleanAndParseJson(input)).toEqual({ title: 'Hello', body: 'World' })
  })

  it('parses valid JSON with extra whitespace', () => {
    const input = '  \n  {"key":"value"}  \n'
    expect(cleanAndParseJson(input)).toEqual({ key: 'value' })
  })

  it('parses JSON wrapped in ```json ... ``` block', () => {
    const input = '```json\n{"key":"value"}\n```'
    expect(cleanAndParseJson(input)).toEqual({ key: 'value' })
  })

  it('parses JSON wrapped in ``` ... ``` block (no language tag)', () => {
    const input = '```\n{"a":1}\n```'
    expect(cleanAndParseJson(input)).toEqual({ a: 1 })
  })

  it('extracts JSON from text before and after the block', () => {
    const input = 'Here is the JSON:\n```json\n{"x":true}\n```\nHope that helps!'
    expect(cleanAndParseJson(input)).toEqual({ x: true })
  })

  it('extracts JSON using outer braces when no code block present', () => {
    const input = 'Some text before {"inner":"value"} and after'
    expect(cleanAndParseJson(input)).toEqual({ inner: 'value' })
  })

  it('extracts JSON with nested structure using outer braces', () => {
    const input = 'prefix\n{"a":{"b":[1,2,3]}}\nsuffix'
    expect(cleanAndParseJson(input)).toEqual({ a: { b: [1, 2, 3] } })
  })

  it('throws on completely invalid JSON (no valid JSON structure)', () => {
    expect(() => cleanAndParseJson('this is not json at all')).toThrow(/Failed to parse/i)
    expect(() => cleanAndParseJson('{{{ broken')).toThrow(/Failed to parse/i)
  })

  it('throws on empty string', () => {
    expect(() => cleanAndParseJson('')).toThrow(/Failed to parse/i)
  })

  it('throws on whitespace-only string', () => {
    expect(() => cleanAndParseJson('   \n  \n')).toThrow(/Failed to parse/i)
  })

  it('parses JSON array at root', () => {
    const input = '[1,2,3]'
    expect(cleanAndParseJson(input)).toEqual([1, 2, 3])
  })

  it('extracts JSON array from standalone array input', () => {
    const input = '[1,2,3]'
    expect(cleanAndParseJson(input)).toEqual([1, 2, 3])
  })

  it('returns the parsed object (not a string)', () => {
    const result = cleanAndParseJson('{"n":42}')
    expect(typeof result).toBe('object')
    expect(result).not.toBeInstanceOf(String)
  })

  it('parses JSON when response starts with preamble text (no fences)', () => {
    const input = 'Here is the analysis you requested:\n{"tone":["friendly"],"sentence_style":"short"}'
    expect(cleanAndParseJson(input)).toEqual({ tone: ['friendly'], sentence_style: 'short' })
  })

  it('skips braces inside string values to find the outer object', () => {
    const input = '{"tone":["a"],"system_prompt_cache":"you can write {examples} like this"}'
    expect(cleanAndParseJson(input)).toEqual({
      tone: ['a'],
      system_prompt_cache: 'you can write {examples} like this',
    })
  })

  it('handles escaped quotes inside string values', () => {
    const input = '{"tone":["a"],"system_prompt_cache":"he said \\"hello\\" to me"}'
    expect(cleanAndParseJson(input)).toEqual({
      tone: ['a'],
      system_prompt_cache: 'he said "hello" to me',
    })
  })

  it('extracts the LAST top-level object when multiple appear in the text', () => {
    const input = 'First draft: {"tone":["x"]}\nFinal answer:\n{"tone":["y"],"sentence_style":"medium"}'
    expect(cleanAndParseJson(input)).toEqual({ tone: ['y'], sentence_style: 'medium' })
  })

  it('extracts JSON from inside a code fence even when preamble is also present', () => {
    const input = 'Sure! Here you go:\n```json\n{"k":1}\n```\nLet me know if you need more.'
    expect(cleanAndParseJson(input)).toEqual({ k: 1 })
  })

  it('repairs truncated JSON missing closing braces and string terminator', () => {
    const input = '{"tone":["friendly"],"system_prompt_cache":"You are a helpful wri'
    const parsed = cleanAndParseJson(input) as Record<string, unknown>
    expect(parsed.tone).toEqual(['friendly'])
    expect(typeof parsed.system_prompt_cache).toBe('string')
  })
})
