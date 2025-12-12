import crypto from 'crypto'
import { Patent, Prisma } from '@prisma/client'
import { db } from '@/lib/db'

export interface SearchFilters {
  ipc?: string[]
  cpc?: string[]
  assignee?: string
  startDate?: string
  endDate?: string
}

export interface PatentSearchResult {
  patent: Patent
  highlights: {
    title?: string
    abstract?: string
    claims?: string
    classifications?: string
  }
  lexicalScore: number
  semanticScore: number
  score: number
}

export interface SearchResponse {
  provider: string
  schema: typeof patentSearchSchema
  total: number
  page: number
  pageSize: number
  results: PatentSearchResult[]
}

export const patentSearchSchema = {
  indexName: 'patents',
  engine: process.env.SEARCH_ENGINE || 'meilisearch',
  fields: [
    { name: 'title', type: 'text', description: 'Patent title' },
    { name: 'abstract', type: 'text', description: 'Abstract and summary' },
    { name: 'claimsText', type: 'text', description: 'Flattened claims text' },
    { name: 'classifications', type: 'string[]', description: 'IPC/CPC codes' },
    { name: 'assignee', type: 'string', description: 'Assignee or applicant' },
    { name: 'filingDate', type: 'date', description: 'Filing date' },
    { name: 'publicationDate', type: 'date', description: 'Publication date' },
  ],
}

interface EmbeddingProvider {
  providerName: string
  embed(text: string): Promise<number[]>
}

class LocalEmbeddingProvider implements EmbeddingProvider {
  providerName = 'local-simhash'

  async embed(text: string): Promise<number[]> {
    const tokens = tokenize(text)
    const vector = new Array(64).fill(0)

    tokens.forEach((token) => {
      const hash = crypto.createHash('sha256').update(token).digest()
      for (let i = 0; i < 64; i += 1) {
        vector[i] += hash[i]
      }
    })

    const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1
    return vector.map((value) => value / magnitude)
  }
}

class OpenAIEmbeddingProvider implements EmbeddingProvider {
  providerName = 'openai'
  model: string

  constructor(private apiKey: string, model = 'text-embedding-3-small') {
    this.model = model
  }

  async embed(text: string): Promise<number[]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model: this.model, input: text }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI embedding failed: ${response.statusText}`)
    }

    const payload = (await response.json()) as { data: Array<{ embedding: number[] }> }
    return payload.data?.[0]?.embedding || []
  }
}

function createEmbeddingProvider(): EmbeddingProvider {
  const apiKey = process.env.OPENAI_API_KEY
  if (apiKey) {
    return new OpenAIEmbeddingProvider(apiKey)
  }
  return new LocalEmbeddingProvider()
}

function tokenize(text: string | undefined | null) {
  if (!text) return []
  return text.toLowerCase().match(/[\p{L}\p{N}-]+/gu)?.filter(Boolean) || []
}

function cosineSimilarity(a: number[], b: number[]) {
  if (!a.length || !b.length || a.length !== b.length) return 0
  const dot = a.reduce((sum, value, index) => sum + value * b[index], 0)
  const magA = Math.sqrt(a.reduce((sum, value) => sum + value * value, 0))
  const magB = Math.sqrt(b.reduce((sum, value) => sum + value * value, 0))
  if (!magA || !magB) return 0
  return dot / (magA * magB)
}

function lexicalScore(text: string, tokens: string[]) {
  if (!tokens.length) return 0
  const lower = text.toLowerCase()
  const counts = tokens.map((token) => lower.split(token).length - 1)
  const maxCount = Math.max(...counts, 1)
  return counts.reduce((sum, count) => sum + count / maxCount, 0) / tokens.length
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function highlightField(text: string | null | undefined, tokens: string[], length = 220) {
  if (!text) return undefined
  if (!tokens.length) return escapeHtml(text.slice(0, length))
  const escaped = escapeHtml(text)
  const pattern = new RegExp(`(${tokens.map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
  const match = escaped.match(pattern)

  let snippet = escaped.slice(0, length)
  if (match?.index !== undefined) {
    const start = Math.max(match.index - 60, 0)
    snippet = escaped.slice(start, start + length)
  }

  return snippet.replace(pattern, '<mark>$1</mark>')
}

function buildWhere(filters: SearchFilters): Prisma.PatentWhereInput {
  const where: Prisma.PatentWhereInput = {}

  if (filters.ipc?.length) {
    where.ipcClasses = { contains: filters.ipc.join(','), mode: 'insensitive' }
  }
  if (filters.cpc?.length) {
    where.cpcClasses = { contains: filters.cpc.join(','), mode: 'insensitive' }
  }
  if (filters.assignee) {
    where.assignee = { contains: filters.assignee, mode: 'insensitive' }
  }
  if (filters.startDate || filters.endDate) {
    where.filingDate = {
      gte: filters.startDate ? new Date(filters.startDate) : undefined,
      lte: filters.endDate ? new Date(filters.endDate) : undefined,
    }
  }

  return where
}

export class HybridSearchService {
  private embeddingProvider: EmbeddingProvider

  constructor(embeddingProvider = createEmbeddingProvider()) {
    this.embeddingProvider = embeddingProvider
  }

  async search(
    query: string,
    filters: SearchFilters,
    page = 1,
    pageSize = 10
  ): Promise<SearchResponse> {
    const tokens = tokenize(query)
    const where = buildWhere(filters)
    const candidates = await db.patent.findMany({
      where,
      take: 100,
      orderBy: { updatedAt: 'desc' },
    })

    const queryEmbedding = await this.embeddingProvider.embed(query)

    const scored = await Promise.all(
      candidates.map(async (patent) => {
        const documentText = [
          patent.title,
          patent.abstract,
          patent.claimsText,
          patent.ipcClasses,
          patent.cpcClasses,
        ]
          .filter(Boolean)
          .join('\n')

        let semanticScore = 0
        try {
          const docEmbedding = await this.embeddingProvider.embed(documentText)
          semanticScore = cosineSimilarity(queryEmbedding, docEmbedding)
        } catch (error) {
          console.warn('Semantic scoring failed, continuing with lexical score', error)
        }

        const lexical = lexicalScore(documentText, tokens)
        const score = semanticScore * 0.6 + lexical * 0.4

        const highlights = {
          title: highlightField(patent.title, tokens, 140),
          abstract: highlightField(patent.abstract, tokens),
          claims: highlightField(patent.claimsText, tokens),
          classifications: highlightField(
            [patent.ipcClasses, patent.cpcClasses].filter(Boolean).join(', '),
            tokens,
            120
          ),
        }

        return { patent, highlights, lexicalScore: lexical, semanticScore, score }
      })
    )

    const sorted = scored.sort((a, b) => b.score - a.score)
    const start = (page - 1) * pageSize
    const paginated = sorted.slice(start, start + pageSize)

    return {
      provider: this.embeddingProvider.providerName,
      schema: patentSearchSchema,
      total: sorted.length,
      page,
      pageSize,
      results: paginated,
    }
  }
}
