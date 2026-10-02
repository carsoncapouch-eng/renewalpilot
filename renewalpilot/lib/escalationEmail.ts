export type EscalationItem = {
  name: string
  person: string
  responsible: string
  expiration: string
  daysOverdue: number
  link: string
}

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function niceDate(d: string) {
  return new Date(d.slice(0, 10) + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function buildEscalationEmail({
  orgName,
  items,
  dashboardLink,
}: {
  orgName: string
  items: EscalationItem[]
  dashboardLink: string
}) {
  const n = items.length
  const subject =
    n === 1
      ? `Overdue: ${items[0].name} (${items[0].person}) at ${orgName}`
      : `${n} renewals are overdue at ${orgName}`

  const rows = items
    .map(
      (it) => `
        <tr>
          <td style="padding:14px 0;border-top:1px solid #f3f4f6;">
            <a href="${it.link}" style="font-size:15px;font-weight:600;color:#111827;text-decoration:none;">${esc(it.name)}</a>
            <div style="font-size:13px;color:#6b7280;margin-top:2px;">
              ${esc(it.person)}${it.responsible ? ` · Responsible: ${esc(it.responsible)}` : ''}
            </div>
          </td>
          <td align="right" style="padding:14px 0;border-top:1px solid #f3f4f6;white-space:nowrap;vertical-align:top;">
            <span style="display:inline-block;background:#fee2e2;color:#b91c1c;font-size:12px;font-weight:600;padding:3px 10px;border-radius:999px;">
              ${it.daysOverdue} day${it.daysOverdue === 1 ? '' : 's'} overdue
            </span>
            <div style="font-size:12px;color:#9ca3af;margin-top:4px;">Expired ${niceDate(it.expiration)}</div>
          </td>
        </tr>`
    )
    .join('')

  const html = `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="background:#b91c1c;padding:20px 28px;color:#ffffff;font-size:18px;font-weight:700;">
                RenewalPilot · Overdue alert
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 8px;font-size:21px;color:#111827;">
                  ${n === 1 ? 'A renewal is still overdue' : `${n} renewals are still overdue`}
                </h1>
                <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#4b5563;">
                  These items at <strong>${esc(orgName)}</strong> have expired and no new document has been uploaded yet.
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${rows}
                </table>
                <div style="margin-top:24px;">
                  <a href="${dashboardLink}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px;">
                    Open RenewalPilot
                  </a>
                </div>
                <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">
                  You're getting this because you're on the ${esc(orgName)} team. This alert repeats weekly until each item is renewed.
                  The owner can change this on the Team page.
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