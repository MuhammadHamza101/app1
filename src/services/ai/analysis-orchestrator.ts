import { Patent, AnalysisRun, AnalysisRunStatus, AnalysisRunType } from '@prisma/client'
import crypto from 'crypto'
import { db } from '@/lib/db'
import { CompletionResult, LLMProvider, resolveProvider, logPrompt } from './providers'

export type ClaimInsight = {
  claimNumber: string
  text: string
  summary: string
  novelty: string
  risk: { score: number; rationale: string }
}

export type AnalysisOutputs = {
  patentSummary: string
  claims: ClaimInsight[]
}

const CLAIM_CHUNK_SIZE = 5

function parseClaims(claimsText?: string | null) {
  if (!claimsText) return [] as Array<{ number: string; text: string }>
  return claimsText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d+)\.?\s*(.*)$/)
      if (match) return { number: match[1], text: match[2] || line }
      return { number: crypto.randomUUID().slice(0, 6), text: line }
    })
}

function buildPrompt(type: AnalysisRunType, patent: Patent, claims: Array<{ number: string; text: string }>) {
  const header = [
    `Patent: ${patent.title}`,
    `Application: ${patent.applicationNumber ?? 'n/a'}`,
    `Publication: ${patent.publicationNumber ?? 'n/a'}`,
    `Assignee: ${patent.assignee ?? 'n/a'}`,
    `IPC: ${patent.ipcClasses ?? 'n/a'}`,
    `CPC: ${patent.cpcClasses ?? 'n/a'}`,
  ]
    .filter(Boolean)
    .join('\n')

  const claimSlice = claims
    .slice(0, CLAIM_CHUNK_SIZE)
    .map((c) => `${c.number}. ${c.text}`)
    .join('\n')

  const base = `${header}\n\nAbstract: ${patent.abstract ?? 'n/a'}\nClaims sample:\n${claimSlice}`

  if (type === 'NOVELTY') {
    return `${base}\n\nIdentify novelty cues, distinguishing features, and suggested prior art search directions for each claim.`
  }
  if (type === 'RISK') {
    return `${base}\n\nAssess litigation or FTO risk with a 1-5 score and rationale per claim. Keep PII out of the answer.`
  }
  return `${base}\n\nSummarize the inventive concept and produce concise bullet summaries per claim.`
}

function chunkClaims(claims: Array<{ number: string; text: string }>) {
  const chunks: Array<Array<{ number: string; text: string }>> = []
  for (let i = 0; i < claims.length; i += CLAIM_CHUNK_SIZE) {
    chunks.push(claims.slice(i, i + CLAIM_CHUNK_SIZE))
  }
  return chunks
}

async function runWithProvider(
  provider: LLMProvider,
  type: AnalysisRunType,
  patent: Patent,
  claims: Array<{ number: string; text: string }>,
  runId: string,
  userId?: string,
) {
  const outputs: AnalysisOutputs = { patentSummary: '', claims: [] }
  const steps: Array<{ stage: string; status: string; detail?: string }> = []

  const prompt = buildPrompt(type, patent, claims)
  const completion = await provider.complete(prompt)
  await logPrompt(runId, completion, userId, patent.id)
  outputs.patentSummary = completion.content
  steps.push({ stage: 'overview', status: 'completed', detail: 'Patent-level summary created' })

  const claimChunks = chunkClaims(claims)
  for (const chunk of claimChunks) {
    const claimPrompt = `${patent.title}\n\nClaims:\n${chunk
      .map((c) => `${c.number}. ${c.text}`)
      .join('\n')}\n\nProvide summary, novelty cues, and risk score (1-5) with rationale for each claim. Avoid PII.`
    const claimCompletion = await provider.complete(claimPrompt)
    await logPrompt(runId, claimCompletion, userId, patent.id)

    const chunkInsights: ClaimInsight[] = chunk.map((claim) => ({
      claimNumber: claim.number,
      text: claim.text,
      summary: `Summary placeholder for claim ${claim.number}`,
      novelty: `Novelty cues derived from model output: ${claimCompletion.content.slice(0, 200)}`,
      risk: {
        score: 3,
        rationale: 'Heuristic risk estimate from model output.',
      },
    }))
    outputs.claims.push(...chunkInsights)
    steps.push({ stage: `claims-${chunk[0].number}`, status: 'completed', detail: `Analyzed claims ${chunk[0].number}` })
  }

  return { outputs, steps, prompt, completion }
}

export class AnalysisOrchestrator {
  async start(type: AnalysisRunType, patent: Patent, userId?: string, providerName?: 'local' | 'openai' | 'anthropic') {
    const provider = resolveProvider(providerName)
    const claims = parseClaims(patent.claimsText)
    const initial = await db.analysisRun.create({
      data: {
        type,
        patentId: patent.id,
        userId,
        status: AnalysisRunStatus.RUNNING,
        promptHash: crypto.randomUUID(),
        prompt: 'initializing',
        provider: provider.name,
        modelName: 'pending',
      },
    })

    const result = await runWithProvider(provider, type, patent, claims, initial.id, userId)

    const finalRun = await db.analysisRun.update({
      where: { id: initial.id },
      data: {
        status: AnalysisRunStatus.COMPLETED,
        outputs: result.outputs,
        steps: result.steps,
        prompt: result.prompt,
        promptHash: crypto.createHash('sha256').update(result.prompt).digest('hex'),
        modelName: result.completion.model,
        provider: result.completion.provider,
        tokenUsage: result.completion.tokens,
        cost: result.completion.cost,
        completedAt: new Date(),
      },
    })

    return finalRun
  }

  async stream(runId: string) {
    return db.analysisRun.findUnique({ where: { id: runId } })
  }
}
