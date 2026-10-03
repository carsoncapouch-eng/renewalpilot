// Builds the branded reminder email (subject + HTML) for one requirement.

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

function siteOrigin(link: string) {
  try {
    return new URL(link).origin
  } catch {
    return 'https://renewalpilot-eta.vercel.app'
  }
}

export function buildEmail(opts: { name: string; person: string; expiration: string; days: number; link: string }) {
  const { days } = opts
  const name = escapeHtml(opts.name)
  const person = escapeHtml(opts.person)
  const dateLabel = new Date(opts.expiration.slice(0, 10) + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  })
  const homeLink = `${siteOrigin(opts.link)}/?utm_source=reminder_footer&utm_medium=email`

  const red = { color: '#b23b3b', bg: '#fbeeee' }
  const amber = { color: '#c08a2e', bg: '#fbf3e4' }
  const calm = { color: '#3b5b6b', bg: '#eef3f5' }

  let subject: string, badge: string, tone = calm
  if (days < 0) {
    subject = `Overdue: ${opts.name} expired ${-days} days ago`
    badge = `Overdue · expired ${-days} days ago`; tone = red
  } else if (days === 0) {
    subject = `${opts.name} expires today`
    badge = 'Expires today'; tone = red
  } else if (days === 1) {
    subject = `${opts.name} expires tomorrow`
    badge = 'Expires tomorrow'; tone = amber
  } else {
    subject = `Reminder: ${opts.name} expires in ${days} days`
    badge = `Expires in ${days} days`; tone = days <= 7 ? amber : calm
  }

  const html = `
  <div style="background:#f6f5f2;padding:32px 16px;font-family:'IBM Plex Sans',Arial,sans-serif;color:#1c2530">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e3e1db;border-radius:12px;overflow:hidden">
      <div style="padding:18px 28px;border-bottom:1px solid #e3e1db;font-weight:700;font-size:16px;letter-spacing:-0.01em">RenewalPilot</div>
      <div style="padding:28px">
        <span style="display:inline-block;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:600;color:${tone.color};background:${tone.bg}">${badge}</span>
        <h1 style="font-size:22px;line-height:1.3;margin:16px 0 6px;font-weight:600">${name}</h1>
        <p style="margin:0 0 22px;color:#5b6774;font-size:14px">Responsible: <strong style="color:#1c2530">${person}</strong></p>
        <table style="width:100%;border-collapse:collapse;margin:0 0 24px;font-size:14px">
          <tr>
            <td style="padding:12px 14px;background:#f6f5f2;border-radius:8px 0 0 8px;color:#5b6774">Expiration date</td>
            <td style="padding:12px 14px;background:#f6f5f2;border-radius:0 8px 8px 0;text-align:right;font-weight:600">${dateLabel}</td>
          </tr>
        </table>
        <a href="${opts.link}" style="display:inline-block;background:#3b5b6b;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:14px">Upload renewal</a>
        <p style="margin:22px 0 0;color:#5b6774;font-size:13px;line-height:1.5">Once the new document is uploaded, these reminders stop automatically.</p>
      </div>
    </div>
    <p style="max-width:520px;margin:16px auto 0;text-align:center;color:#8a949e;font-size:12px;line-height:1.5">
      You’re receiving this because you’re responsible for, or manage, this requirement in RenewalPilot.
    </p>
    <p style="max-width:520px;margin:10px auto 0;text-align:center;color:#8a949e;font-size:12px;line-height:1.5">
      Sent with <a href="${homeLink}" style="color:#5b6774;font-weight:600;text-decoration:underline">RenewalPilot</a> · automatic license &amp; certification reminders for small teams. Free 14-day trial.
    </p>
  </div>`

  return { subject, html }
}