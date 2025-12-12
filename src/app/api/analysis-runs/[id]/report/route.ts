import { NextResponse } from 'next/server'
import PDFDocument from 'pdfkit'
import { Document, Packer, Paragraph, HeadingLevel } from 'docx'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

async function buildPdf(run: any) {
  const doc = new PDFDocument()
  const chunks: Buffer[] = []
  doc.fontSize(18).text('Patent analysis report', { underline: true })
  doc.moveDown()
  doc.fontSize(12).text(`Run ID: ${run.id}`)
  doc.text(`Model: ${run.modelName || 'n/a'} (${run.provider || 'local'})`)
  doc.text(`Status: ${run.status}`)
  doc.moveDown()
  doc.fontSize(14).text('Patent summary')
  doc.fontSize(12).text(run.outputs?.patentSummary || 'No summary available').moveDown()
  doc.fontSize(14).text('Claims')
  run.outputs?.claims?.forEach((claim: any) => {
    doc.fontSize(12).text(`Claim ${claim.claimNumber}: ${claim.summary}`)
    doc.text(`Novelty: ${claim.novelty}`)
    doc.text(`Risk ${claim.risk?.score ?? 'n/a'}/5: ${claim.risk?.rationale}`)
    doc.moveDown()
  })
  doc.end()
  return new Promise<Buffer>((resolve) => {
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
  })
}

async function buildDocx(run: any) {
  const children = [
    new Paragraph({ text: 'Patent analysis report', heading: HeadingLevel.TITLE }),
    new Paragraph({ text: `Run ID: ${run.id}` }),
    new Paragraph({ text: `Model: ${run.modelName || 'n/a'} (${run.provider || 'local'})` }),
    new Paragraph({ text: `Status: ${run.status}` }),
    new Paragraph({ text: ' ' }),
    new Paragraph({ text: 'Patent summary', heading: HeadingLevel.HEADING_2 }),
    new Paragraph(run.outputs?.patentSummary || 'No summary available'),
    new Paragraph({ text: ' ' }),
    new Paragraph({ text: 'Claims', heading: HeadingLevel.HEADING_2 }),
  ]

  run.outputs?.claims?.forEach((claim: any) => {
    children.push(new Paragraph({ text: `Claim ${claim.claimNumber}`, heading: HeadingLevel.HEADING_3 }))
    children.push(new Paragraph({ text: claim.summary || 'No summary' }))
    children.push(new Paragraph({ text: claim.novelty || 'No novelty notes' }))
    children.push(new Paragraph({ text: `Risk ${claim.risk?.score ?? 'n/a'}/5: ${claim.risk?.rationale || ''}` }))
    children.push(new Paragraph({ text: ' ' }))
  })

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)
  return buffer
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(request.url)
  const format = (searchParams.get('format') || 'pdf').toLowerCase()

  const run = await db.analysisRun.findUnique({ where: { id: params.id } })
  if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 })

  if (format === 'docx') {
    const buffer = await buildDocx(run)
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="analysis-${run.id}.docx"`,
      },
    })
  }

  const pdf = await buildPdf(run)
  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="analysis-${run.id}.pdf"`,
    },
  })
}
