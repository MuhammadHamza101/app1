import nodemailer from 'nodemailer'

const globalMailer = globalThis as unknown as {
  mailer?: nodemailer.Transporter
}

function createTransport() {
  if (process.env.SMTP_URL) {
    return nodemailer.createTransport(process.env.SMTP_URL)
  }

  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASSWORD
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASSWORD,
            }
          : undefined,
    })
  }

  return nodemailer.createTransport({
    jsonTransport: true,
  })
}

export async function sendEmail(options: {
  recipients: string[]
  subject: string
  html?: string
  text?: string
  attachments?: { filename: string; content: Buffer | string }[]
}) {
  const transporter = globalMailer.mailer || createTransport()
  globalMailer.mailer = transporter

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'notifications@patentflow.local',
    to: options.recipients.join(', '),
    subject: options.subject,
    html: options.html,
    text: options.text,
    attachments: options.attachments,
  })
}
