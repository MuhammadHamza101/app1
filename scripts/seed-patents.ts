import { db } from '../src/lib/db'
import { subYears } from 'date-fns'

async function seedPatents() {
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
        abstract:
          'System for retrieving and ranking prior-art based on semantic similarity and claim coverage.',
        claimsText:
          '1. A method comprising generating embeddings for claims and comparing against a vector index...\n2. The method of claim 1 wherein risk signals are weighted by jurisdictional precedence.',
        jurisdiction: 'US',
        assignee: 'PatentFlow Labs',
        status: 'IN_REVIEW' as const,
        filingDate: subYears(new Date(), 2),
        publicationDate: subYears(new Date(), 1),
        technology: 'Search & Retrieval',
        keywords: 'semantic search, vector index, prior art',
      },
      {
        title: 'Collaborative Claim Annotation Workspace',
        number: 'US202400057',
        abstract:
          'Real-time annotation environment for patent claims with comment threading and role-aware controls.',
        claimsText:
          '1. A collaborative interface providing synchronized cursors and anchored comments...\n2. The workspace of claim 1 with permissions bound to attorney and reviewer roles.',
        jurisdiction: 'EP',
        assignee: 'PatentFlow Labs',
        status: 'READY' as const,
        filingDate: subYears(new Date(), 3),
        publicationDate: subYears(new Date(), 2),
        technology: 'Collaboration',
        keywords: 'annotations, comments, real-time',
      },
      {
        title: 'Automated Claim Risk Scoring Engine',
        number: 'WO202300099',
        abstract:
          'Pipeline that scores claim novelty and clarity risk using LLM-assisted heuristics and legal rules.',
        claimsText:
          '1. A scoring pipeline that ingests parsed claims and outputs a normalized risk index...\n2. The pipeline of claim 1 wherein rule-based signals are blended with model explanations.',
        jurisdiction: 'WO',
        assignee: 'PatentFlow Labs',
        status: 'DRAFT' as const,
        filingDate: subYears(new Date(), 1),
        publicationDate: new Date(),
        technology: 'Risk Analysis',
        keywords: 'risk scoring, LLM, heuristics',
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
