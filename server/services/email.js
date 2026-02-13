import { Resend } from 'resend';

let resend;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Storyteller <onboarding@resend.dev>';

export async function sendPasswordResetEmail(to, resetToken, baseUrl) {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    resend = new Resend(process.env.RESEND_API_KEY);
  }

  const resetLink = `${baseUrl}/reset-password/${resetToken}`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Reset your Storyteller password',
    html: `
      <h2>Password Reset</h2>
      <p>You requested a password reset for your Storyteller account.</p>
      <p><a href="${resetLink}" style="display:inline-block;padding:12px 24px;background:#4a6741;color:#fff;text-decoration:none;border-radius:6px;">Reset Password</a></p>
      <p>Or copy this link: ${resetLink}</p>
      <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
    `,
  });
}
