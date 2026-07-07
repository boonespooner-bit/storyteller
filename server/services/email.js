import { Resend } from 'resend';

let resend;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Story Braid <onboarding@resend.dev>';

function getResend() {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export async function sendPasswordResetEmail(to, resetToken, baseUrl) {
  const r = getResend();

  const resetLink = `${baseUrl}/reset-password/${resetToken}`;

  await r.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Reset your Story Braid password',
    html: `
      <h2>Password Reset</h2>
      <p>You requested a password reset for your Story Braid account.</p>
      <p><a href="${resetLink}" style="display:inline-block;padding:12px 24px;background:#4a6741;color:#fff;text-decoration:none;border-radius:6px;">Reset Password</a></p>
      <p>Or copy this link: ${resetLink}</p>
      <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
    `,
  });
}

export async function sendShareInviteEmail(to, bookTitle, authorName, shareToken, baseUrl) {
  const r = getResend();

  const shareLink = `${baseUrl}/shared/${shareToken}`;

  await r.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `You've been invited to read "${bookTitle}"`,
    html: `
      <h2>You&rsquo;re invited to read a story</h2>
      <p><strong>${authorName}</strong> has shared their book <em>&ldquo;${bookTitle}&rdquo;</em> with you on Story Braid.</p>
      <p><a href="${shareLink}" style="display:inline-block;padding:12px 24px;background:#e94560;color:#fff;text-decoration:none;border-radius:6px;">Read the Book</a></p>
      <p>Or copy this link: ${shareLink}</p>
    `,
  });
}
