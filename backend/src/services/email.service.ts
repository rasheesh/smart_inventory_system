import nodemailer from 'nodemailer'
import {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
  FRONTEND_URL,
} from '../lib/env'

function createTransporter() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  })
}

export async function sendPasswordResetEmail(
  to: string,
  resetToken: string,
): Promise<void> {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${encodeURIComponent(resetToken)}`
  const subject = 'Reset your IntelliShelf password'
  const text = `You requested a password reset for your IntelliShelf account.

Click the link below to set a new password (expires in 1 hour):
${resetUrl}

If you did not request this, you can safely ignore this email.`

  const transporter = createTransporter()

  if (!transporter) {
    console.log('[email] SMTP not configured — password reset link (dev only):')
    console.log(resetUrl)
    return
  }

  await transporter.sendMail({
    from: SMTP_FROM,
    to,
    subject,
    text,
  })
}
