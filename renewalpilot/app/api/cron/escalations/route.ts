import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { buildEscalationEmail, EscalationItem } from '@/lib/escalationEmail'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const DAY = 86400000

type Row = {
  id: string
  name: string
  expiration_date: string
  last_escalation_date: string | null
  responsible_name: string | null
  employees: { name: string; active: boolean | null } | { name: string; active: boolean | null }[] | null
}

function appUrl() {
  return (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://renewalpilot-eta.vercel.app'
  ).replace(/\/$/, '')
}

function toDay(s: string) {
  return Date.parse(s.slice(0, 10) + 'T00:00:00Z')
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1'
  const todayStr = new Date().toISOString().slice(0, 10)
  const today = toDay(todayStr)

  const { data: orgs, error: orgError } = await supabaseAdmin
    .from('organizations')
    .select('id, name, escalation_days')
    .gt('escalation_days', 0)

  if (orgError) {
    return NextResponse.json({ error: orgError.message }, { status: 500 })
  }

  const results: Record<string, unknown>[] = []

  for (const org of orgs || []) {
    // Overdue requirements in this company
    const { data, error } = await supabaseAdmin
      .from('requirements')
      .select('id, name, expiration_date, last_escalation_date, responsible_name, employees(name, active)')
      .eq('organization_id', org.id)
      .not('expiration_date', 'is', null)
      .lt('expiration_date', todayStr)

    if (error) {
      results.push({ org: org.name, error: error.message })
      continue
    }

    const reqs = (data || []) as unknown as Row[]
    if (reqs.length === 0) continue

    // Skip anything with a document waiting for review
    const { data: pending } = await supabaseAdmin
      .from('documents')
      .select('requirement_id')
      .in('requirement_id', reqs.map((r) => r.id))
      .eq('status', 'pending_review')

    const pendingSet = new Set((pending || []).map((d: { requirement_id: string }) => d.requirement_id))

    const items: (EscalationItem & { id: string })[] = []

    for (const r of reqs) {
      const emp = Array.isArray(r.employees) ? r.employees[0] : r.employees
      if (emp && emp.active === false) continue
      if (pendingSet.has(r.id)) continue

      const expiration = toDay(r.expiration_date)
      const daysOverdue = Math.round((today - expiration) / DAY)
      if (daysOverdue < org.escalation_days) continue

      if (r.last_escalation_date) {
        const last = toDay(r.last_escalation_date)
        const daysSinceLast = Math.round((today - last) / DAY)
        // Already alerted for this expiration within the last week
        if (last >= expiration && daysSinceLast < 7) continue
      }

      items.push({
        id: r.id,
        name: r.name,
        person: emp?.name || 'Company-wide',
        responsible: r.responsible_name || '',
        expiration: r.expiration_date,
        daysOverdue,
        link: `${appUrl()}/requirements/${r.id}`,
      })
    }

    if (items.length === 0) continue

    // Everyone on the team
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('organization_id', org.id)

    const emails: string[] = []
    for (const p of profiles || []) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(p.user_id)
      if (u?.user?.email) emails.push(u.user.email)
    }

    if (emails.length === 0) {
      results.push({ org: org.name, skipped: 'no team emails' })
      continue
    }

    const to = process.env.REMINDER_TEST_EMAIL ? [process.env.REMINDER_TEST_EMAIL] : emails

    if (dryRun) {
      results.push({
        org: org.name,
        wouldEmail: to,
        items: items.map((i) => `${i.name} (${i.person}) - ${i.daysOverdue} days overdue`),
      })
      continue
    }

    const { subject, html } = buildEscalationEmail({
      orgName: org.name || 'Your company',
      items,
      dashboardLink: `${appUrl()}/attention`,
    })

    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const { error: sendError } = await resend.emails.send({
        from: process.env.REMINDER_FROM_EMAIL || 'RenewalPilot <onboarding@resend.dev>',
        to,
        subject,
        html,
      })

      if (sendError) {
        results.push({ org: org.name, error: sendError.message })
      } else {
        await supabaseAdmin
          .from('requirements')
          .update({ last_escalation_date: todayStr })
          .in('id', items.map((i) => i.id))
        results.push({ org: org.name, emailed: to, items: items.length })
      }
    } catch (e) {
      results.push({ org: org.name, error: (e as Error).message })
    }

    await sleep(600)
  }

  return NextResponse.json({ dryRun, today: todayStr, results })
}