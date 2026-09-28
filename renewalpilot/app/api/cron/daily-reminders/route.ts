import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { buildEmail } from '@/lib/reminderEmail'

const resend = new Resend(process.env.RESEND_API_KEY)
const DAY_MS = 86_400_000

// ── Reminder schedule ─────────────────────────────────────────────
// First reminder: each requirement's own reminder_schedule (e.g. "30 days before").
// Then these days before expiration (0 = the day it expires):
const FOLLOW_UP_DAYS = [7, 1, 0]
// After it expires: remind again every N days until a new document is approved.
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
    .select('id, name, expiration_date, status, reminder_schedule, organization_id, last_reminder_date, upload_token, employees(name, email)')
    .not('expiration_date', 'is', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Requirements with an upload waiting for review: don't nag, the employee already sent it
  const { data: pendingDocs } = await supabaseAdmin
    .from('documents')
    .select('requirement_id')
    .eq('status', 'pending_review')
  const awaitingReview = new Set((pendingDocs ?? []).map(d => d.requirement_id))

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
    if (awaitingReview.has(r.id)) {
      skipped.push({ requirement: r.name, reason: 'Renewal uploaded, waiting for review' })
      continue
    }

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
      link: `${appUrl}/upload/${r.upload_token}`, // employee upload page, no login needed
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