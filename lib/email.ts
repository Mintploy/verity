import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM = 'Verity <hello@verityprive.com>';
const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://verityprive.com';

const wrap = (body: string) => `
  <div style="font-family:Georgia,serif;max-width:480px;margin:0 auto;padding:48px 24px;color:#2C0E26;background:#FFF4F4">
    <div style="font-size:26px;letter-spacing:0.06em;margin-bottom:40px;color:#2C0E26">Verity</div>
    ${body}
    <div style="margin-top:48px;padding-top:24px;border-top:1px solid #FFE0DE;font-family:-apple-system,sans-serif;font-size:11px;color:#C8A6B4;letter-spacing:0.3px;line-height:1.7">
      FOR VERIFIED WOMEN ONLY · VERITYPRIVE.COM<br>
      He will never know you searched.
    </div>
  </div>
`;

export async function sendMagicLink(email: string, token: string) {
  const link = `${BASE}/auth/verify?token=${token}`;
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Your Verity sign-in link',
    html: wrap(`
      <h1 style="font-size:36px;font-weight:400;line-height:1.05;margin:0 0 16px;letter-spacing:-0.4px">
        Your sign-in link.
      </h1>
      <p style="font-family:-apple-system,sans-serif;font-size:15px;line-height:1.65;color:#5C2A50;margin:0 0 32px;font-weight:300">
        Click below to sign in to Verity. This link expires in 15 minutes.
      </p>
      <a href="${link}" style="display:inline-block;padding:16px 32px;background:#FF4E8E;color:#FFF4F4;text-decoration:none;border-radius:9999px;font-size:17px;font-weight:500;letter-spacing:0.2px">
        Sign in to Verity →
      </a>
      <p style="font-family:-apple-system,sans-serif;font-size:12px;color:#C8A6B4;margin:28px 0 0;line-height:1.6">
        If you didn't request this, ignore it. Your account is safe.
      </p>
    `),
  });
}

export async function sendWelcomeEmail(email: string, token: string) {
  const link = `${BASE}/auth/verify?token=${token}`;
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "You're in. Welcome to Verity.",
    html: wrap(`
      <h1 style="font-size:48px;font-weight:400;line-height:1;margin:0 0 8px;letter-spacing:-0.6px">
        You're in.
      </h1>
      <p style="font-size:24px;font-style:italic;color:#E7506C;margin:0 0 24px;font-weight:300">
        Welcome to Verity.
      </p>
      <p style="font-family:-apple-system,sans-serif;font-size:16px;line-height:1.65;color:#5C2A50;margin:0 0 32px;font-weight:300">
        Your membership is active. Click below to run your first search — drop in a phone number and get the full picture in seconds.
      </p>
      <a href="${link}" style="display:inline-block;padding:18px 36px;background:#FF4E8E;color:#FFF4F4;text-decoration:none;border-radius:9999px;font-size:18px;font-weight:500">
        Start searching →
      </a>
      <p style="font-family:-apple-system,sans-serif;font-size:13px;color:#C8A6B4;margin:32px 0 0;line-height:1.65">
        Membership active for 12 months · Renews only if you choose<br>
        This link expires in 15 minutes — bookmark the site after signing in.
      </p>
    `),
  });
}
