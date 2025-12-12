export interface IngestionFilePayload {
  name: string
  type: string
  data: string
}

export interface NormalizedPatent {
  title: string
  abstract?: string
  applicationNumber?: string
  publicationNumber?: string
  jurisdiction?: string
  language?: string
  sourceFile: string
  metadata?: Record<string, unknown>
  content: string
}

export interface IngestionJobData {
  userId: string
  firmId?: string | null
  files: IngestionFilePayload[]
}

export interface IngestionResult {
  patentsCreated: number
  filesProcessed: number
  languages: Record<string, number>
  errors: string[]
}
