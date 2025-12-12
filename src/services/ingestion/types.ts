import { IngestionJobStatus } from '@prisma/client'
import { StoredFileReference } from './storage'

export type IngestionFilePayload = StoredFileReference

export interface NormalizedPatent {
  title: string
  abstract?: string
  claims?: string[]
  classifications?: {
    ipc?: string[]
    cpc?: string[]
  }
  assignee?: string
  filingDate?: string
  publicationDate?: string
  applicationNumber?: string
  publicationNumber?: string
  jurisdiction?: string
  language?: string
  sourceFile: string
  metadata?: Record<string, unknown>
  content: string
}

export interface IngestionJobData {
  jobId: string
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

export interface IngestionJobDetail {
  id: string
  status: IngestionJobStatus
  files: IngestionFilePayload[]
  checksums?: Record<string, string>
  errors?: string[]
  extractedMetadata?: Record<string, unknown>
  totalSize?: number
  result?: IngestionResult
  createdAt: string
  updatedAt: string
}
