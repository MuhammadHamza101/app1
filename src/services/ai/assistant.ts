import { Patent, User } from '@prisma/client'
import { db } from '@/lib/db'

export type AssistantMode = 'summary' | 'novelty' | 'risk'

interface AssistantResult {
  provider: string
  response: string
  prompt: string
}

function buildPrompt(mode: AssistantMode, patent: Patent) {
  const header = `Patent: ${patent.title}\nApplication: ${patent.applicationNumber ?? 'n/a'}\nPublication: ${patent.publicationNumber ?? 'n/a'}\nAssignee: ${patent.assignee ?? 'n/a'}\nIPC: ${patent.ipcClasses ?? 'n/a'}\nCPC: ${patent.cpcClasses ?? 'n/a'}\nJurisdiction: ${patent.jurisdiction ?? 'n/a'}\nLanguage: ${patent.language ?? 'n/a'}`
  const abstract = patent.abstract ? `\nAbstract: ${patent.abstract}` : ''
  const claims = patent.claimsText ? `\nClaims: ${patent.claimsText.slice(0, 1800)}` : ''

  if (mode === 'summary') {
    return `${header}${abstract}\n\nSummarize the inventive concept with bullet points for practitioners.`
  }
  if (mode === 'novelty') {
    return `${header}${abstract}${claims}\n\nHighlight novelty indicators, distinguishing features, and any likely prior art search directions.`
  }
  return `${header}${abstract}${claims}\n\nAssess litigation or freedom-to-operate risk with concrete factors and a 1-5 risk score.`
}

async function callOpenAI(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an experienced patent attorney drafting concise work product.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 380,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`OpenAI request failed: ${response.status} ${text}`)
  }

  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
  return payload.choices?.[0]?.message?.content ?? ''
}

function fallbackResponse(mode: AssistantMode, patent: Patent) {
  const summary = patent.abstract || patent.title
  if (mode === 'summary') {
    return `Key takeaways:\n- ${summary?.slice(0, 180) || 'Concise summary unavailable.'}\n- IPC focus: ${patent.ipcClasses ?? 'n/a'} | CPC: ${patent.cpcClasses ?? 'n/a'}\n- Assignee context: ${patent.assignee ?? 'unspecified'}`
  }
  if (mode === 'novelty') {
    return [
      'Novelty indicators:',
      `- Claimed subject matter references ${patent.cpcClasses ?? 'general classifications'}; search adjacent subclasses for overlap.`,
      `- Distinguishing features should be contrasted against ${patent.assignee ?? 'peer assignees'} filings in the last 3 years.`,
      '- Investigate non-patent literature for implementation specifics.',
    ].join('\n')
  }
  return [
    'Risk screen (heuristic):',
    `- Jurisdiction: ${patent.jurisdiction ?? 'unspecified'}; check enforcement climate.`,
    `- Publication recency ${patent.publicationDate ?? 'unknown'} may affect estoppel considerations.`,
    '- Baseline risk score: 3/5 (raise or lower after deeper review).',
  ].join('\n')
}

export async function runAssistant(mode: AssistantMode, patent: Patent, user?: User | null): Promise<AssistantResult> {
  const prompt = buildPrompt(mode, patent)
  let provider = 'rule-based'
  let responseText: string

  try {
    const aiResponse = await callOpenAI(prompt)
    if (aiResponse) {
      provider = 'openai'
      responseText = aiResponse
    } else {
      responseText = fallbackResponse(mode, patent)
    }
  } catch (error) {
    console.error('LLM call failed, using fallback:', error)
    responseText = fallbackResponse(mode, patent)
  }

  await db.aiAuditLog.create({
    data: {
      patentId: patent.id,
      userId: user?.id,
      action: mode,
      prompt,
      response: responseText,
      provider,
    },
  })

  return { provider, response: responseText, prompt }
}
