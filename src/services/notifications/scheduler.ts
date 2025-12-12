import { Queue, Worker, JobsOptions } from 'bullmq'
import IORedis from 'ioredis'
import { format } from 'date-fns'

import { sendEmail } from './mailer'

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379')

const globalQueues = globalThis as unknown as {
  alertsQueue?: Queue
  alertsWorker?: Worker
}

export type ScheduledReportJob = {
  type: 'report'
  recipients: string[]
  subject: string
  html: string
  text?: string
}

export type DeadlineAlertJob = {
  type: 'deadline'
  recipients: string[]
  summary: string
  deadline: Date
  link?: string
}

export const alertsQueue =
  globalQueues.alertsQueue ||
  new Queue('reports-and-alerts', {
    connection,
  })

globalQueues.alertsQueue = alertsQueue

if (!globalQueues.alertsWorker) {
  globalQueues.alertsWorker = new Worker(
    'reports-and-alerts',
    async (job) => {
      const payload = job.data as ScheduledReportJob | DeadlineAlertJob

      if (payload.type === 'report') {
        await sendEmail({
          recipients: payload.recipients,
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
        })
        return
      }

      if (payload.type === 'deadline') {
        const formattedDate = format(payload.deadline, 'PPP')
        await sendEmail({
          recipients: payload.recipients,
          subject: `Upcoming deadline: ${formattedDate}`,
          html: `<p>${payload.summary}</p><p><strong>Due:</strong> ${formattedDate}</p>${
            payload.link ? `<p><a href="${payload.link}">View details</a></p>` : ''
          }`,
          text: `${payload.summary}\nDue: ${formattedDate}${payload.link ? `\n${payload.link}` : ''}`,
        })
      }
    },
    {
      connection,
      concurrency: 2,
    }
  )
}

type ScheduleOptions = JobsOptions | undefined

export async function scheduleReportEmail(payload: Omit<ScheduledReportJob, 'type'>, options?: ScheduleOptions) {
  await alertsQueue.add('scheduled-report', { ...payload, type: 'report' }, options)
}

export async function scheduleDeadlineAlert(payload: Omit<DeadlineAlertJob, 'type'>, options?: ScheduleOptions) {
  await alertsQueue.add('deadline-alert', { ...payload, type: 'deadline' }, options)
}

export async function scheduleMaintenanceWindowAlert(
  recipients: string[],
  description: string,
  dueDate: Date,
  link?: string
) {
  await scheduleDeadlineAlert(
    {
      recipients,
      summary: description,
      deadline: dueDate,
      link,
    },
    { delay: Math.max(dueDate.getTime() - Date.now(), 0) }
  )
}
