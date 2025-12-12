import AdmZip from 'adm-zip'
import { parse as parseCsv } from 'csv-parse/sync'
import pdfParse from 'pdf-parse'
import LanguageDetect from 'languagedetect'
import path from 'path'
import { NormalizedPatent } from './types'

const languageDetector = new LanguageDetect()

export function detectLanguageFromText(text: string | undefined | null) {
  if (!text || !text.trim()) return undefined
  try {
    const [topCandidate] = languageDetector.detect(text, 1) || []
    if (Array.isArray(topCandidate)) {
      const [language] = topCandidate
      return language
    }
  } catch (error) {
    console.warn('Language detection failed', error)
  }
  return undefined
}

export async function parsePdfBuffer(
  buffer: Buffer,
  filename: string
): Promise<NormalizedPatent[]> {
  const pdf = await pdfParse(buffer)
  const text = pdf.text?.trim() ?? ''
  return [
    {
      title: pdf.info?.Title || filename.replace(/\.pdf$/i, ''),
      abstract: pdf.info?.Subject || text.slice(0, 2000),
      language: detectLanguageFromText(text),
      sourceFile: filename,
      metadata: {
        info: pdf.info,
        metadata: pdf.metadata?.info,
        numPages: pdf.numpages,
      },
      content: text,
    },
  ]
}

export function parseCsvBuffer(
  buffer: Buffer,
  filename: string
): NormalizedPatent[] {
  const csvText = buffer.toString('utf-8')
  const rows = parseCsv(csvText, { columns: true, skip_empty_lines: true }) as Array<
    Record<string, string>
  >

  return rows.map((row, index) => {
    const contentParts = [row.abstract, row.claims, row.description, row.text].filter(
      Boolean
    ) as string[]

    const content =
      contentParts.join('\n\n').trim() ||
      JSON.stringify(row, null, 2)

    return {
      title: row.title || `${filename} #${index + 1}`,
      abstract: row.abstract,
      applicationNumber: row.applicationNumber || row.application_number,
      publicationNumber: row.publicationNumber || row.publication_number,
      jurisdiction: row.jurisdiction,
      language: row.language || detectLanguageFromText(content),
      sourceFile: filename,
      metadata: row,
      content,
    }
  })
}

export async function parseZipBuffer(
  buffer: Buffer,
  filename: string
): Promise<NormalizedPatent[]> {
  const zip = new AdmZip(buffer)
  const results: NormalizedPatent[] = []

  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue
    const entryName = entry.entryName
    const entryBuffer = entry.getData()
    const extension = path.extname(entryName).toLowerCase()

    if (extension === '.pdf') {
      results.push(...(await parsePdfBuffer(entryBuffer, entryName)))
    } else if (extension === '.csv') {
      results.push(...parseCsvBuffer(entryBuffer, entryName))
    }
  }

  return results.length
    ? results
    : [
        {
          title: filename,
          abstract: undefined,
          language: undefined,
          sourceFile: filename,
          metadata: { note: 'Zip file contained no supported documents' },
          content: '',
        },
      ]
}

export async function parseBufferByType(
  buffer: Buffer,
  filename: string,
  mimeType?: string
): Promise<NormalizedPatent[]> {
  const extension = path.extname(filename).toLowerCase()
  if (mimeType === 'application/zip' || extension === '.zip') {
    return parseZipBuffer(buffer, filename)
  }
  if (mimeType === 'text/csv' || extension === '.csv') {
    return parseCsvBuffer(buffer, filename)
  }
  return parsePdfBuffer(buffer, filename)
}
