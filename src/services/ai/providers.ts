import crypto from 'crypto'
import { db } from '@/lib/db'

type ProviderName = 'local' | 'openai' | 'anthropic'

type CompletionOptions = {
  model?: string
  maxTokens?: number
  temperature?: number
  retries?: number
}

export interface CompletionResult {
  provider: ProviderName
  model: string
  prompt: string
  promptHash: string
  content: string
  tokens: number
  cost?: number
}

export interface LLMProvider {
  name: ProviderName
  complete(prompt: string, options?: CompletionOptions): Promise<CompletionResult>
}

function hashPrompt(prompt: string) {
  return crypto.createHash('sha256').update(prompt).digest('hex')
}

function redactPII(text: string) {
  return text
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[redacted-email]')
    .replace(/\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g, '[redacted-ssn]')
    .replace(/\b\d{10,}\b/g, '[redacted-number]')
}

function estimateTokens(prompt: string, content: string) {
  return Math.ceil((prompt.length + content.length) / 4)
}

async function withRetries<T>(fn: () => Promise<T>, retries = 2) {
  let attempt = 0
  let delay = 500
  while (attempt <= retries) {
    try {
      return await fn()
    } catch (error: any) {
      const status = error?.status || error?.response?.status
      if (status === 429 && attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delay))
        delay *= 2
        attempt += 1
        continue
      }
      if (attempt >= retries) throw error
      attempt += 1
    }
  }
  throw new Error('Exceeded retries')
}

export class LocalProvider implements LLMProvider {
  name: ProviderName = 'local'

  async complete(prompt: string, options?: CompletionOptions): Promise<CompletionResult> {
    const sanitized = redactPII(prompt)
    const content = [
      'Heuristic analysis generated locally without external calls.',
      'Key signals: clarity, novelty markers, and risk triggers have been reviewed.',
      'Next action: validate with authoritative sources before relying on this summary.',
    ].join('\n')

    const tokens = estimateTokens(prompt, content)
    return {
      provider: this.name,
      model: options?.model || 'rules-local',
      prompt: sanitized,
      promptHash: hashPrompt(sanitized),
      content,
      tokens,
      cost: 0,
    }
  }
}

export class OpenAIProvider implements LLMProvider {
  name: ProviderName = 'openai'

  async complete(prompt: string, options?: CompletionOptions): Promise<CompletionResult> {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      const fallback = new LocalProvider()
      return fallback.complete(prompt, options)
    }

    const sanitized = redactPII(prompt)
    const model = options?.model || process.env.OPENAI_MODEL || 'gpt-4o-mini'

    const response = await withRetries(async () => {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: 'You are a patent analyst. Avoid including personally identifiable information in outputs.' },
            { role: 'user', content: sanitized },
          ],
          temperature: options?.temperature ?? 0.3,
          max_tokens: options?.maxTokens ?? 512,
        }),
      })

      if (!res.ok) {
        const errorText = await res.text()
        const err: any = new Error(`OpenAI error ${res.status}: ${errorText}`)
        err.status = res.status
        throw err
      }
      return res.json()
    }, options?.retries ?? 2)

    const content = response?.choices?.[0]?.message?.content || 'No response'
    const tokens = estimateTokens(prompt, content)
    const cost = tokens * 0.000002

    return {
      provider: this.name,
      model,
      prompt: sanitized,
      promptHash: hashPrompt(sanitized),
      content,
      tokens,
      cost,
    }
  }
}

export class AnthropicProvider implements LLMProvider {
  name: ProviderName = 'anthropic'

  async complete(prompt: string, options?: CompletionOptions): Promise<CompletionResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      const fallback = new LocalProvider()
      return fallback.complete(prompt, options)
    }

    const sanitized = redactPII(prompt)
    const model = options?.model || process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest'

    const response = await withRetries(async () => {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: options?.maxTokens ?? 512,
          temperature: options?.temperature ?? 0.3,
          messages: [
            { role: 'user', content: sanitized },
          ],
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        const err: any = new Error(`Anthropic error ${res.status}: ${text}`)
        err.status = res.status
        throw err
      }
      return res.json()
    }, options?.retries ?? 2)

    const content = response?.content?.[0]?.text || 'No response'
    const tokens = estimateTokens(prompt, content)
    const cost = tokens * 0.000003

    return {
      provider: this.name,
      model,
      prompt: sanitized,
      promptHash: hashPrompt(sanitized),
      content,
      tokens,
      cost,
    }
  }
}

export function resolveProvider(name?: ProviderName): LLMProvider {
  if (name === 'openai') return new OpenAIProvider()
  if (name === 'anthropic') return new AnthropicProvider()
  return new LocalProvider()
}

export async function logPrompt(runId: string, result: CompletionResult, userId?: string, patentId?: string) {
  await db.aiAuditLog.create({
    data: {
      action: 'analysis-run',
      provider: result.provider,
      model: result.model,
      prompt: result.prompt,
      promptHash: result.promptHash,
      response: result.content,
      tokens: result.tokens,
      cost: result.cost,
      userId,
      patentId,
      runId,
    } as any,
  })
}
