import path from 'node:path'
import { execSync } from 'node:child_process'
import { config } from 'dotenv'
import { subYears } from 'date-fns'

config({ path: path.join(process.cwd(), '.env') })
config({ path: path.join(process.cwd(), '.env.local'), override: true })

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db'
}

async function getDb() {
  const { db } = await import('../src/lib/db')
  return db
}

async function ensureSchema(db: Awaited<ReturnType<typeof getDb>>) {
  try {
    await db.user.count()
  } catch (error: any) {
    if (error?.code === 'P2021') {
      console.log('🛠️ Database not initialized; running prisma db push...')
      execSync('npx prisma db push --skip-generate', { stdio: 'inherit' })
      return
    }
    throw error
  }
}

async function seedPatents() {
  const db = await getDb()
  await ensureSchema(db)
  try {
    const admin = await db.user.findFirst({ where: { email: 'admin@patentflow.com' } })
    if (!admin) {
      console.error('❌ Cannot seed patents because admin@patentflow.com is missing. Run `npm run seed:default` first.')
      return
    }

    const existingCount = await db.patent.count()
    if (existingCount > 0) {
      console.log(`✅ Patents already exist (${existingCount} records); skipping seed.`)
      return
    }

    const patents = [
      {
        title: 'AI-Assisted Prior Art Navigator',
        number: 'US202400001',
        applicationNumber: '17/123,456',
        publicationNumber: 'US-2024-0001-A1',
        abstract:
          'System for retrieving and ranking prior-art based on semantic similarity and claim coverage.',
        claimsText:
          '1. A method comprising generating embeddings for claims and comparing against a vector index...\n2. The method of claim 1 wherein risk signals are weighted by jurisdictional precedence.',
        content:
          'A retrieval system that fuses embeddings with lexical scoring to improve prior art recall and ranking for patent claims.',
        jurisdiction: 'US',
        assignee: 'PatentFlow Labs',
        status: 'IN_REVIEW' as const,
        language: 'en',
        filingDate: subYears(new Date(), 2),
        publicationDate: subYears(new Date(), 1),
        technology: 'Search & Retrieval',
        keywords: 'semantic search, vector index, prior art',
        ipcClasses: 'G06F16/30',
        cpcClasses: 'G06F16/29',
        sourceFile: 'seed/prior-art.pdf',
      },
      {
        title: 'Collaborative Claim Annotation Workspace',
        number: 'US202400057',
        applicationNumber: '18/987,654',
        publicationNumber: 'US-2024-0057-A1',
        abstract:
          'Real-time annotation environment for patent claims with comment threading and role-aware controls.',
        claimsText:
          '1. A collaborative interface providing synchronized cursors and anchored comments...\n2. The workspace of claim 1 with permissions bound to attorney and reviewer roles.',
        content:
          'A workspace enabling collaborative review of patent claims with semantic anchors and inline comment threads.',
        jurisdiction: 'EP',
        assignee: 'PatentFlow Labs',
        status: 'READY' as const,
        language: 'en',
        filingDate: subYears(new Date(), 3),
        publicationDate: subYears(new Date(), 2),
        technology: 'Collaboration',
        keywords: 'annotations, comments, real-time',
        ipcClasses: 'G06F40/00',
        cpcClasses: 'G06F40/20',
        sourceFile: 'seed/annotation.docx',
      },
      {
        title: 'Automated Claim Risk Scoring Engine',
        number: 'WO202300099',
        applicationNumber: 'PCT/US2023/00099',
        publicationNumber: 'WO-2023-00099-A1',
        abstract:
          'Pipeline that scores claim novelty and clarity risk using LLM-assisted heuristics and legal rules.',
        claimsText:
          '1. A scoring pipeline that ingests parsed claims and outputs a normalized risk index...\n2. The pipeline of claim 1 wherein rule-based signals are blended with model explanations.',
        content:
          'Risk scoring pipeline that evaluates claim clarity, novelty, and coverage using embeddings plus heuristics.',
        jurisdiction: 'WO',
        assignee: 'PatentFlow Labs',
        status: 'DRAFT' as const,
        language: 'en',
        filingDate: subYears(new Date(), 1),
        publicationDate: new Date(),
        technology: 'Risk Analysis',
        keywords: 'risk scoring, LLM, heuristics',
        ipcClasses: 'G06N20/00',
        cpcClasses: 'G06N20/10',
        sourceFile: 'seed/risk-scoring.json',
      },
    ]

    for (const patent of patents) {
      const created = await db.patent.create({
        data: {
          ...patent,
          createdBy: admin.id,
          ingestions: {
            create: [
              {
                sourceType: 'MANUAL_ENTRY',
                status: 'COMPLETED',
                notes: 'Seeded example',
              },
            ],
          },
          tags: {
            create: [
              { tag: 'seed' },
              { tag: 'demo' },
              { tag: patent.jurisdiction?.toLowerCase() || 'unknown' },
            ],
          },
          insights: {
            create: [
              {
                summary: `${patent.title} seeded insight: baseline overview for demos`,
                riskScore: patent.status === 'DRAFT' ? 60 : 35,
                highlights: {
                  jurisdiction: patent.jurisdiction,
                  keywords: patent.keywords,
                  technology: patent.technology,
                },
                tags: 'seed,overview',
              },
            ],
          },
        },
      })

      console.log(`✅ Seeded patent ${created.title}`)
    }
  } catch (error) {
    console.error('❌ Error while seeding patents:', error)
  } finally {
    await db.$disconnect()
  }
}

seedPatents()
