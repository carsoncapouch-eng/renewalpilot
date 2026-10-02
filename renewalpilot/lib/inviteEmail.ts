function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildInviteEmail({
  orgName,
  inviterName,
  link,
}: {
  orgName: string
  inviterName: string
  link: string
}) {
  const subject = `${inviterName} invited you to join ${orgName} on RenewalPilot`

  const html = `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="background:#2563eb;padding:20px 28px;color:#ffffff;font-size:18px;font-weight:700;">
                RenewalPilot
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 12px;font-size:22px;color:#111827;">You're invited to join ${esc(orgName)}</h1>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#4b5563;">
                  ${esc(inviterName)} invited you to help track licenses, certifications and renewals for
                  <strong>${esc(orgName)}</strong> on RenewalPilot.
                </p>
                <a href="${link}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px;">
                  Accept invite
                </a>
                <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">
                  Use this same email address when you sign up or log in. If you weren't expecting this, you can ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  return { subject, html }
}