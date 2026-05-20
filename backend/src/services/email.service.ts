import { Resend } from 'resend'
import { RESEND_API_KEY, RESEND_FROM, FRONTEND_URL } from '../lib/env'

const resend = new Resend(RESEND_API_KEY)

export async function sendPasswordResetEmail(
  to: string,
  resetToken: string,
): Promise<void> {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${encodeURIComponent(resetToken)}`

  await resend.emails.send({
    from: RESEND_FROM,
    to,
    subject: 'Reset your InvSys PH password',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #111; margin-bottom: 8px;">Reset your password</h2>
        <p style="color: #555; margin-bottom: 24px;">
          You requested a password reset for your InvSys PH account.
          Click the button below to set a new password. This link expires in <strong>1 hour</strong>.
        </p>
        <a href="${resetUrl}"
           style="display: inline-block; background: #2563eb; color: #fff; padding: 12px 24px;
                  border-radius: 6px; text-decoration: none; font-weight: 600;">
          Reset Password
        </a>
        <p style="color: #999; font-size: 12px; margin-top: 32px;">
          If you did not request this, you can safely ignore this email.<br/>
          This link will expire in 1 hour.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #bbb; font-size: 11px;">InvSys PH — Smart Inventory System</p>
      </div>
    `,
  })
}
