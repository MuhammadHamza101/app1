import { AlertEventType } from '@prisma/client'
import { isAfter } from 'date-fns'

import { db } from '@/lib/db'
import { scheduleDeadlineAlert } from '../notifications/scheduler'

export type AlertRuleInput = {
  name: string
  description?: string
  threshold?: number
  channel: { email?: string[]; slackWebhook?: string }
  eventType: AlertEventType
  patentId?: string
  userId: string
}

export async function createAlertRule(input: AlertRuleInput) {
  return db.alertRule.create({ data: { ...input, channel: input.channel } })
}

export async function evaluateAlertRules() {
  const rules = await db.alertRule.findMany({ where: { isActive: true }, include: { patent: true, user: true } })

  for (const rule of rules) {
    if (rule.eventType === 'MAINTENANCE_WINDOW' && rule.patent?.filingDate) {
      const checkpoints = [3.5, 7.5, 11.5]
      for (const years of checkpoints) {
        const dueDate = new Date(rule.patent.filingDate)
        dueDate.setMonth(dueDate.getMonth() + Math.round(years * 12))
        if (isAfter(dueDate, new Date())) continue

        await db.alertNotification.create({
          data: {
            ruleId: rule.id,
            message: `${rule.patent.title} is past the ${years}-year maintenance window`,
            deliveredTo: rule.channel,
          },
        })

        if (rule.channel.email?.length) {
          await scheduleDeadlineAlert({
            recipients: rule.channel.email,
            summary: rule.description || 'Maintenance alert',
            deadline: dueDate,
          })
        }

        if (rule.channel.slackWebhook) {
          await fetch(rule.channel.slackWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: rule.description || 'Maintenance deadline reached.' }),
          })
        }
      }
    }

    if (rule.eventType === 'FLAGGED_RISK') {
      const flaggedCount = await db.patent.count({ where: { status: 'FLAGGED' } })
      if (rule.threshold && flaggedCount >= rule.threshold) {
        await db.alertNotification.create({
          data: {
            ruleId: rule.id,
            message: `Flagged portfolio count ${flaggedCount} exceeds threshold ${rule.threshold}`,
            deliveredTo: rule.channel,
          },
        })

        if (rule.channel.email?.length) {
          await scheduleDeadlineAlert({
            recipients: rule.channel.email,
            summary: 'Flagged patent threshold reached',
            deadline: new Date(),
          })
        }
      }
    }
  }
}
