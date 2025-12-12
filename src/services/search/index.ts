import crypto from 'crypto'
import { Patent, PatentEmbedding, PatentTag, Prisma } from '@prisma/client'
import { db } from '@/lib/db'

export interface SearchFilters {
  ipc?: string[]
  cpc?: string[]
  assignee?: string
  startDate?: string
  endDate?: string
  jurisdictions?: string[]
  tags?: string[]
  technology?: string
  createdBy?: string
}

export interface SearchOptions {
  semantic?: boolean
}

export interface SearchIndexField {
  name: string
  type: 'text' | 'string' | 'string[]' | 'date'
  description: string
  searchable?: boolean
  filterable?: boolean
  sortable?: boolean
  vectorized?: boolean
}

export interface SearchIndexSchema {
  indexName: string
  engine: string
  searchable: string[]
  filterable: string[]
  sortable: string[]
  vectorDimensions: number
  fields: SearchIndexField[]
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
  schema: SearchIndexSchema
  total: number
  page: number
  pageSize: number
  results: PatentSearchResult[]
}

export const patentSearchSchema: SearchIndexSchema = {
  indexName: 'patents',
  engine: process.env.SEARCH_ENGINE || 'meilisearch',
  searchable: ['title', 'abstract', 'claimsText', 'classifications', 'content', 'technology', 'keywords'],
  filterable: [
    'ipcClasses',
    'cpcClasses',
    'assignee',
    'jurisdiction',
    'filingDate',
    'publicationDate',
    'tags',
  ],
  sortable: ['filingDate', 'publicationDate', 'updatedAt'],
  vectorDimensions: Number(process.env.SEARCH_VECTOR_DIMENSIONS || (process.env.OPENAI_API_KEY ? 1536 : 64)),
  fields: [
    { name: 'title', type: 'text', description: 'Patent title', searchable: true, vectorized: true },
    { name: 'abstract', type: 'text', description: 'Abstract and summary', searchable: true, vectorized: true },
    {
      name: 'claimsText',
      type: 'text',
      description: 'Flattened claims text',
      searchable: true,
      vectorized: true,
    },
    {
      name: 'classifications',
      type: 'string[]',
      description: 'IPC/CPC codes (normalized list)',
      searchable: true,
      filterable: true,
    },
    { name: 'content', type: 'text', description: 'Flattened description or body', searchable: true, vectorized: true },
    { name: 'assignee', type: 'string', description: 'Assignee or applicant', filterable: true },
    { name: 'jurisdiction', type: 'string', description: 'Jurisdiction or office', filterable: true },
    { name: 'keywords', type: 'string', description: 'Keywords/labels', searchable: true, filterable: true },
    { name: 'tags', type: 'string[]', description: 'Upload and derived tags', searchable: false, filterable: true },
    { name: 'filingDate', type: 'date', description: 'Filing date', filterable: true, sortable: true },
    { name: 'publicationDate', type: 'date', description: 'Publication date', filterable: true, sortable: true },
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

export function buildEmbeddableText(patent: Patent) {
  return [
    patent.title,
    patent.abstract,
    patent.claimsText,
    patent.content,
    patent.keywords,
    patent.technology,
    patent.ipcClasses,
    patent.cpcClasses,
    patent.assignee,
  ]
    .filter(Boolean)
    .join('\n')
    .trim()
}

function tokenize(text: string | undefined | null) {
  if (!text) return []
  return text.toLowerCase().match(/[\p{L}\p{N}-]+/gu)?.filter(Boolean) || []
}

function computeContentHashForPatent(patent: Patent) {
  return crypto.createHash('sha256').update(buildEmbeddableText(patent)).digest('hex')
}

function jsonToVector(value: Prisma.JsonValue | null | undefined): number[] {
  if (!value) return []
  if (Array.isArray(value)) {
    return value.map((entry) => Number(entry) || 0)
  }
  return []
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

function weightedLexicalScore(
  buckets: Array<{ text: string | null | undefined; weight: number }>,
  tokens: string[]
) {
  const totalWeight = buckets.reduce((sum, bucket) => sum + bucket.weight, 0) || 1
  const contributions = buckets.map((bucket) => {
    if (!bucket.text) return 0
    return (lexicalScore(bucket.text, tokens) * bucket.weight) / totalWeight
  })

  return contributions.reduce((sum, score) => sum + score, 0)
}

function computeDocumentFrequencies(documents: string[][]) {
  const frequencies = new Map<string, number>()

  documents.forEach((docTokens) => {
    const seen = new Set(docTokens)
    seen.forEach((token) => {
      frequencies.set(token, (frequencies.get(token) || 0) + 1)
    })
  })

  return frequencies
}

function bm25Score(
  documentTokens: string[],
  queryTokens: string[],
  avgDocLength: number,
  docFreqs: Map<string, number>,
  totalDocs: number,
  k1 = 1.5,
  b = 0.75
) {
  if (!queryTokens.length) return 0

  const docLength = documentTokens.length || 1
  const termCounts = documentTokens.reduce<Record<string, number>>((counts, token) => {
    counts[token] = (counts[token] || 0) + 1
    return counts
  }, {})

  let score = 0

  queryTokens.forEach((token) => {
    const frequency = termCounts[token] || 0
    const docFrequency = docFreqs.get(token) || 0.5
    const idf = Math.log(1 + (totalDocs - docFrequency + 0.5) / (docFrequency + 0.5))
    const numerator = frequency * (k1 + 1)
    const denominator = frequency + k1 * (1 - b + (b * docLength) / avgDocLength)
    score += idf * (numerator / denominator)
  })

  return score
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
  if (filters.technology) {
    where.technology = { contains: filters.technology, mode: 'insensitive' }
  }
  if (filters.jurisdictions?.length) {
    where.jurisdiction = { in: filters.jurisdictions }
  }
  if (filters.tags?.length) {
    where.tags = { some: { tag: { in: filters.tags } } }
  }
  if (filters.createdBy) {
    where.createdBy = filters.createdBy
  }
  if (filters.startDate || filters.endDate) {
    where.filingDate = {
      gte: filters.startDate ? new Date(filters.startDate) : undefined,
      lte: filters.endDate ? new Date(filters.endDate) : undefined,
    }
  }

  return where
}

export function buildPatentDocument(patent: Patent & { tags?: PatentTag[] }) {
  return {
    id: patent.id,
    title: patent.title,
    abstract: patent.abstract,
    claimsText: patent.claimsText,
    classifications: [patent.ipcClasses, patent.cpcClasses]
      .filter(Boolean)
      .join(',')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
    ipcClasses: patent.ipcClasses,
    cpcClasses: patent.cpcClasses,
    assignee: patent.assignee,
    jurisdiction: patent.jurisdiction,
    technology: patent.technology,
    keywords: patent.keywords,
    content: patent.content,
    tags: patent.tags?.map((tag) => tag.tag) || [],
    filingDate: patent.filingDate,
    publicationDate: patent.publicationDate,
    updatedAt: patent.updatedAt,
  }
}

export function buildIndexSettings(schema: SearchIndexSchema = patentSearchSchema) {
  return {
    indexName: schema.indexName,
    engine: schema.engine,
    searchableAttributes: schema.searchable,
    filterableAttributes: schema.filterable,
    sortableAttributes: schema.sortable,
    vector: {
      size: schema.vectorDimensions,
      distance: 'cosine',
      provider: process.env.OPENAI_API_KEY ? 'openai' : 'local-simhash',
    },
  }
}

function derivePatentTags(patent: Patent) {
  const tags = new Set<string>()
  if (patent.keywords) {
    patent.keywords
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .forEach((value) => tags.add(value.toLowerCase()))
  }
  if (patent.technology) tags.add(patent.technology.toLowerCase())
  if (patent.jurisdiction) tags.add(patent.jurisdiction.toLowerCase())
  if (patent.status) tags.add(patent.status.toLowerCase())
  return Array.from(tags)
}

async function upsertPatentTags(patent: Patent, source = 'system') {
  const derivedTags = derivePatentTags(patent)
  if (!derivedTags.length) return

  await db.patentTag.deleteMany({ where: { patentId: patent.id, source } })
  await db.patentTag.createMany({
    data: derivedTags.map((tag) => ({ patentId: patent.id, tag, source })),
    skipDuplicates: true,
  })
}

async function upsertPatentEmbedding(
  patent: Patent,
  provider: EmbeddingProvider,
  currentEmbedding?: PatentEmbedding | null
) {
  const contentHash = computeContentHashForPatent(patent)

  if (currentEmbedding && currentEmbedding.contentHash === contentHash) {
    return currentEmbedding
  }

  const text = buildEmbeddableText(patent)
  if (!text) return currentEmbedding ?? null

  const embedding = await provider.embed(text)

  return db.patentEmbedding.upsert({
    where: { patentId_provider: { patentId: patent.id, provider: provider.providerName } },
    update: {
      embedding,
      dimensions: embedding.length,
      contentHash,
      updatedAt: new Date(),
    },
    create: {
      patentId: patent.id,
      provider: provider.providerName,
      embedding,
      dimensions: embedding.length,
      contentHash,
    },
  })
}

export async function indexPatentForSearch(patentId: string, provider = createEmbeddingProvider()) {
  const patent = await db.patent.findUnique({
    where: { id: patentId },
    include: {
      tags: true,
      embeddings: { where: { provider: provider.providerName } },
    },
  })

  if (!patent) return null

  await upsertPatentTags(patent)
  return upsertPatentEmbedding(patent, provider, patent.embeddings?.[0])
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
    pageSize = 10,
    options: SearchOptions = {}
  ): Promise<SearchResponse> {
    const semanticEnabled = options.semantic ?? query.trim().length > 0
    const tokens = tokenize(query)
    const where = buildWhere(filters)
    const candidates = await db.patent.findMany({
      where,
      include: {
        tags: true,
        embeddings: { where: { provider: this.embeddingProvider.providerName } },
      },
      take: 250,
      orderBy: { updatedAt: 'desc' },
    })

    await Promise.all(candidates.map((patent) => upsertPatentTags(patent).catch(() => undefined)))

    const prepared = candidates.map((patent) => {
      const embeddableText = buildEmbeddableText(patent)
      const docTokens = tokenize(embeddableText)
      const buckets = [
        { text: patent.title, weight: 3 },
        { text: patent.abstract, weight: 2 },
        { text: patent.claimsText, weight: 2 },
        { text: patent.content, weight: 1.5 },
        { text: patent.ipcClasses, weight: 1 },
        { text: patent.cpcClasses, weight: 1 },
        { text: patent.keywords, weight: 1 },
      ]

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

      return { patent, buckets, highlights, docTokens, embeddableText }
    })

    const docFreqs = computeDocumentFrequencies(prepared.map((entry) => entry.docTokens))
    const avgDocLength =
      prepared.reduce((sum, entry) => sum + (entry.docTokens.length || 0), 0) / (prepared.length || 1)

    const lexicalRaw = prepared.map((entry) => {
      const bm25 = bm25Score(entry.docTokens, tokens, avgDocLength || 1, docFreqs, prepared.length || 1)
      const weighted = weightedLexicalScore(entry.buckets, tokens)
      return { id: entry.patent.id, score: bm25 + weighted, bm25, weighted }
    })

    const maxLexical = Math.max(...lexicalRaw.map((entry) => entry.score), 1)
    const lexicalMap = new Map(lexicalRaw.map((entry) => [entry.id, entry]))

    let queryEmbedding: number[] = []
    if (semanticEnabled && tokens.length) {
      queryEmbedding = await this.embeddingProvider.embed(query)
    }

    if (semanticEnabled && queryEmbedding.length) {
      const toRefresh = prepared.filter((entry) => {
        const current = entry.patent.embeddings?.[0]
        return (
          !current ||
          current.dimensions !== queryEmbedding.length ||
          current.contentHash !== computeContentHashForPatent(entry.patent)
        )
      })

      if (toRefresh.length) {
        const refreshed = await Promise.all(
          toRefresh.map((entry) => upsertPatentEmbedding(entry.patent, this.embeddingProvider, entry.patent.embeddings?.[0]))
        )
        refreshed.forEach((record, index) => {
          if (record) {
            const patentId = toRefresh[index].patent.id
            const target = prepared.find((item) => item.patent.id === patentId)
            if (target) {
              target.patent.embeddings = [record]
            }
          }
        })
      }
    }

    const scored = prepared.map((entry) => {
      const lexicalEntry = lexicalMap.get(entry.patent.id)
      const lexicalScore = (lexicalEntry?.score || 0) / (maxLexical || 1)

      let semanticScore = 0
      if (semanticEnabled && queryEmbedding.length) {
        const embeddingRecord = entry.patent.embeddings?.[0]
        const embeddingVector = jsonToVector(embeddingRecord?.embedding)
        if (embeddingVector.length === queryEmbedding.length) {
          semanticScore = cosineSimilarity(queryEmbedding, embeddingVector)
        }
      }

      const score = semanticEnabled ? semanticScore * 0.6 + lexicalScore * 0.4 : lexicalScore

      return { patent: entry.patent, highlights: entry.highlights, lexicalScore, semanticScore, score }
    })

    const sorted = scored.sort(
      (a, b) => b.score - a.score || b.patent.updatedAt.getTime() - a.patent.updatedAt.getTime()
    )
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
