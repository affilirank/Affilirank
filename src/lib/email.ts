import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.EMAIL_FROM ?? "AffiliRank <noreply@affilirank.com>";
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? "AffiliRank";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://affilirank.com";
const PRODUCT_NAME =
  process.env.NEXT_PUBLIC_SITE_PRODUCT_NAME ?? SITE_NAME;

export interface SendLicenseEmailOpts {
  to: string;
  buyerName?: string;
  licenseKey: string;
  tier: string;
}

export async function sendLicenseEmail(opts: SendLicenseEmailOpts): Promise<void> {
  const { to, buyerName, licenseKey, tier } = opts;
  const name = buyerName?.split(" ")[0] ?? "there";
  const dashboard = `${SITE_URL}/admin`;
  const subject = `Your ${PRODUCT_NAME} license key is ready`;

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#0a0f1e;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:32px 16px">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden">
      <tr><td style="padding:36px 40px 28px;text-align:center">
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#fff">Welcome to ${PRODUCT_NAME}, ${name}!</h1>
        <p style="margin:0 0 24px;font-size:14px;color:#94a3b8">Your order is confirmed. Here's everything you need to get started.</p>
      </td></tr>
      <tr><td style="padding:0 40px 28px">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:12px;border:1px solid rgba(255,255,255,0.06)">
          <tr><td style="padding:20px 24px;text-align:center">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#7c3aed">Your license key</p>
            <p style="margin:0;font-size:15px;font-weight:700;color:#22d3ee;word-break:break-all;font-family:monospace">${licenseKey}</p>
            <p style="margin:8px 0 0;font-size:12px;color:#64748b">Tier: ${tier}</p>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:0 40px 32px">
        <h3 style="margin:0 0 12px;font-size:14px;color:#e2e8f0">How to activate</h3>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px;line-height:1.5">
            <strong style="color:#c084fc">1.</strong> Log in to your admin at <a href="${dashboard}" style="color:#22d3ee">${SITE_URL.replace("https://", "")}/admin</a><br>
            <strong style="color:#c084fc">2.</strong> Paste your license key in the License tab<br>
            <strong style="color:#c084fc">3.</strong> Ingest your first JVZoo link and watch your deal stream go live
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:0 40px 32px;text-align:center">
        <a href="${dashboard}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#22d3ee);color:#fff;font-weight:700;font-size:14px;text-decoration:none;padding:12px 28px;border-radius:10px">Open Admin Dashboard</a>
      </td></tr>
      <tr><td style="padding:16px 40px;border-top:1px solid rgba(255,255,255,0.06);text-align:center">
        <p style="margin:0;font-size:11px;color:#475569">This email was sent by ${PRODUCT_NAME}. If you didn't make this purchase, contact support immediately.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body>
</html>`;

  await resend.emails.send({
    from: FROM,
    to,
    subject,
    html,
  });
}
