import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const resend = new Resend(process.env.RESEND_API_KEY)
const DAY_MS = 86_400_000

// ── Reminder schedule ─────────────────────────────────────────────
// First reminder: each requirement's own reminder_schedule (e.g. "30 days before").
// Then these days before expiration (0 = the day it expires):
const FOLLOW_UP_DAYS = [7, 1, 0]
// After it expires: remind again every N days until a new document is uploaded.
const OVERDUE_EVERY_DAYS = 7
// ──────────────────────────────────────────────────────────────────

function daysUntil(expiration: string, today: string) {
  return Math.round((Date.parse(expiration.slice(0, 10)) - Date.parse(today)) / DAY_MS)
}

function firstReminderDays(schedule: string | null) {
  const match = schedule?.match(/\d+/)
  return match ? parseInt(match[0], 10) : 30
}

function statusFor(days: number, threshold: number) {
  if (days < 0) return 'overdue'
  if (days === 0) return 'expired'
  if (days <= threshold) return 'expiring_soon'
  return 'active'
}

function isReminderDay(days: number, threshold: number) {
  if (days < 0) return -days % OVERDUE_EVERY_DAYS === 0
  return days === threshold || FOLLOW_UP_DAYS.includes(days)
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

function buildEmail(opts: { name: string; person: string; expiration: string; days: number; link: string }) {
  const { days } = opts
  const name = escapeHtml(opts.name)
  const person = escapeHtml(opts.person)
  const dateLabel = new Date(opts.expiration.slice(0, 10) + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  })

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
  </div>`

  return { subject, html }
}

// Runs once a day (Vercel Cron). Test locally with ?dryRun=1 to preview without sending.
export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const dryRun = url.searchParams.get('dryRun') === '1'
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD (UTC)
  const appUrl = process.env.APP_URL ?? url.origin
  const testInbox = process.env.REMINDER_TEST_EMAIL

  const { data: requirements, error } = await supabaseAdmin
    .from('requirements')
    .select('id, name, expiration_date, status, reminder_schedule, organization_id, last_reminder_date, employees(name, email)')
    .not('expiration_date', 'is', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Admin emails per organization (looked up once per org)
  const adminCache = new Map<string, string[]>()
  async function adminEmails(orgId: string) {
    if (!adminCache.has(orgId)) {
      const { data } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .eq('organization_id', orgId)
        .eq('role', 'admin')
      adminCache.set(orgId, (data ?? []).map(p => p.email).filter(Boolean))
    }
    return adminCache.get(orgId)!
  }

  let statusUpdates = 0
  const sent: object[] = []
  const skipped: object[] = []

  for (const r of requirements ?? []) {
    const threshold = firstReminderDays(r.reminder_schedule)
    const days = daysUntil(r.expiration_date, today)

    // 1. Keep the status up to date
    const status = statusFor(days, threshold)
    if (status !== r.status) {
      statusUpdates++
      if (!dryRun) await supabaseAdmin.from('requirements').update({ status }).eq('id', r.id)
    }

    // 2. Is today a reminder day for this requirement?
    if (!isReminderDay(days, threshold)) continue
    if (r.last_reminder_date === today) continue // already sent today

    const emp = (Array.isArray(r.employees) ? r.employees[0] : r.employees) as { name?: string; email?: string } | null
    const recipients = [...new Set([emp?.email, ...(await adminEmails(r.organization_id))].filter(Boolean))] as string[]
    if (recipients.length === 0) {
      skipped.push({ requirement: r.name, reason: 'No email for employee or admins' })
      continue
    }

    const { subject, html } = buildEmail({
      name: r.name,
      person: emp?.name || 'Unassigned',
      expiration: r.expiration_date,
      days,
      link: `${appUrl}/documents?requirement=${r.id}`,
    })

    if (dryRun) {
      sent.push({ requirement: r.name, days, wouldSendTo: testInbox ? [testInbox] : recipients, subject })
      continue
    }

    const { error: sendError } = await resend.emails.send({
      from: process.env.REMINDER_FROM_EMAIL ?? 'RenewalPilot <onboarding@resend.dev>',
      to: testInbox ? [testInbox] : recipients,
      subject,
      html,
    })

    if (sendError) {
      skipped.push({ requirement: r.name, reason: sendError.message })
      continue
    }

    await supabaseAdmin.from('requirements').update({ last_reminder_date: today }).eq('id', r.id)
    sent.push({ requirement: r.name, days, to: testInbox ? [testInbox] : recipients, subject })
    await new Promise(res => setTimeout(res, 600)) // stay under Resend's rate limit
  }

  return NextResponse.json({ date: today, dryRun, checked: requirements?.length ?? 0, statusUpdates, sent, skipped })
}