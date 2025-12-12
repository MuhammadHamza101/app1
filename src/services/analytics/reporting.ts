import fs from 'node:fs'
import path from 'node:path'
import PDFDocument from 'pdfkit'
import { Document, Packer, Paragraph, TextRun } from 'docx'
import { format } from 'date-fns'

import { AnalyticsSnapshot } from './warehouse'
import { scheduleReportEmail } from '../notifications/scheduler'

function buildPdf(snapshot: AnalyticsSnapshot) {
  const doc = new PDFDocument()
  const chunks: Buffer[] = []
  doc.on('data', (chunk) => chunks.push(chunk))

  doc.fontSize(18).text('Portfolio Analytics Report', { underline: true })
  doc.moveDown()

  doc.fontSize(12).text(`Allowance rate: ${snapshot.allowance.allowanceRate.toFixed(1)}%`)
  doc.text(`Average pendency: ${snapshot.pendency.averageDays} days (n=${snapshot.pendency.sampleSize})`)
  doc.text(`Jurisdictions tracked: ${snapshot.filingsByJurisdiction.length}`)
  doc.text(`Trends window: ${snapshot.trends.length} months`)

  doc.end()
  return new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
  })
}

async function buildDocx(snapshot: AnalyticsSnapshot) {
  const paragraphs = [
    new Paragraph({
      children: [new TextRun({ text: 'Portfolio Analytics Report', bold: true, size: 32 })],
    }),
    new Paragraph(''),
    new Paragraph(`Allowance rate: ${snapshot.allowance.allowanceRate.toFixed(1)}%`),
    new Paragraph(`Average pendency: ${snapshot.pendency.averageDays} days (n=${snapshot.pendency.sampleSize})`),
    new Paragraph(`Tracked jurisdictions: ${snapshot.filingsByJurisdiction.length}`),
  ]

  const doc = new Document({
    sections: [
      {
        children: paragraphs,
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)
  return buffer
}

export async function persistReportArtifacts(snapshot: AnalyticsSnapshot, outputDir = 'desktop') {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const [pdf, docx] = await Promise.all([buildPdf(snapshot), buildDocx(snapshot)])
  const timestamp = format(new Date(), 'yyyyMMdd-HHmm')
  const pdfPath = path.join(outputDir, `analytics-report-${timestamp}.pdf`)
  const docxPath = path.join(outputDir, `analytics-report-${timestamp}.docx`)

  fs.writeFileSync(pdfPath, pdf)
  fs.writeFileSync(docxPath, docx)

  return { pdfPath, docxPath, pdf, docx }
}

export async function deliverScheduledReport(snapshot: AnalyticsSnapshot, recipients: string[], subject: string) {
  const { pdf, docx } = await persistReportArtifacts(snapshot)
  const html = `
    <h2>Portfolio analytics</h2>
    <p>Allowance rate: ${snapshot.allowance.allowanceRate.toFixed(1)}%</p>
    <p>Pendency: ${snapshot.pendency.averageDays} days.</p>
    <p>Generated at ${new Date().toISOString()}</p>
  `

  await scheduleReportEmail({
    recipients,
    subject,
    html,
    text: 'Attached is your scheduled analytics report.',
    attachments: [
      { filename: 'analytics.pdf', content: pdf },
      { filename: 'analytics.docx', content: docx },
    ],
  })
}
