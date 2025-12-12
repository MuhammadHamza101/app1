const RED_FLAGS = ['lawsuit', 'litigation', 'infringe', 'invalid', 'prior art']
const HIGH_VALUE = ['novel', 'innovative', 'breakthrough', 'low power', 'secure']

export function generateInsightsFromText(text: string) {
  const normalized = (text || '').toLowerCase()
  const lengthScore = Math.min(100, Math.max(10, Math.floor(normalized.length / 80)))

  const redFlags = RED_FLAGS.filter((flag) => normalized.includes(flag))
  const positives = HIGH_VALUE.filter((term) => normalized.includes(term))

  let riskScore = 30 + redFlags.length * 10 - positives.length * 5
  riskScore = Math.max(5, Math.min(95, riskScore))

  const summary = normalized
    ? normalized.slice(0, 280).replace(/\s+/g, ' ').trim() || 'Parsed content available for review.'
    : 'Awaiting richer content; baseline insight created.'

  return {
    summary,
    riskScore,
    highlights: {
      redFlags,
      positives,
      size: normalized.length,
      entropyHint: lengthScore,
    },
  }
}
