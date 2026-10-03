import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { accessState } from '@/lib/access'
import { TRIAL_STEPS, TrialContext, TrialStep, textToHtml } from '@/lib/trialEmails'
import { SITE } from '@/lib/site'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const DAY = 86_400_000
const TRIAL_DAYS = 14

type OrgRow = {
  id: string
  name: string | null
  plan: string | null
  subscription_status: string | null
  trial_ends_at: string | null
  trial_emails_sent: string[] | null
}

function appUrl() {
  return (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://renewalpilot-eta.vercel.app'
  ).replace(/\/$/, '')
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1'
  const now = Date.now()
  const testInbox = process.env.REMINDER_TEST_EMAIL

  const { data, error } = await supabaseAdmin
    .from('organizations')
    .select('id, name, plan, subscription_status, trial_ends_at, trial_emails_sent')
    .not('trial_ends_at', 'is', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const orgs = (data || []) as OrgRow[]
  const results: Record<string, unknown>[] = []
  const resend = new Resend(process.env.RESEND_API_KEY)

  for (const org of orgs) {
    // Paying customers never get trial emails
    if (accessState(org) === 'paid') continue

    const trialStart = Date.parse(org.trial_ends_at!) - TRIAL_DAYS * DAY
    const day = Math.floor((now - trialStart) / DAY)
    if (day < 0 || day > 30) continue

    const alreadySent = new Set(org.trial_emails_sent || [])

    // Steps that are due today (or up to 3 days late) and not sent yet, newest first
    const due = TRIAL_STEPS.filter(
      (s) => day >= s.day && day <= s.day + 3 && !alreadySent.has(s.key)
    ).reverse()
    if (due.length === 0) continue

    // Owners of this company
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('user_id, name, role')
      .eq('organization_id', org.id)

    const owners = (profiles || []).filter((p: { role: string | null }) => p.role !== 'member')
    const emails: string[] = []
    let firstName = ''
    for (const p of owners as { user_id: string; name: string | null }[]) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(p.user_id)
      if (u?.user?.email) emails.push(u.user.email)
      if (!firstName && p.name && !p.name.includes('@')) firstName = p.name.trim().split(/\s+/)[0]
    }
    if (emails.length === 0) continue

    const { count: docsCount } = await supabaseAdmin
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', org.id)
      .neq('status', 'pending_review')

    const ctx: TrialContext = {
      firstName: firstName || 'there',
      orgName: org.name || 'your company',
      appUrl: appUrl(),
      founderName: SITE.founderName,
      docsCount: docsCount ?? 0,
    }

    // Pick the newest step that should be sent; skip ones whose condition says no
    const skipped: string[] = []
    let chosen: TrialStep | null = null
    for (const step of due) {
      if (step.shouldSend && !step.shouldSend(ctx)) {
        skipped.push(step.key)
        continue
      }
      chosen = step
      break
    }

    const to = testInbox ? [testInbox] : emails

    if (dryRun) {
      results.push({
        org: org.name,
        day,
        wouldSend: chosen?.key || null,
        wouldSkip: skipped,
        to,
      })
      continue
    }

    const newSent = [...alreadySent, ...skipped]

    if (chosen) {
      const { subject, text } = chosen.build(ctx)
      const payload = {
        from:
          process.env.FOUNDER_FROM_EMAIL ||
          process.env.REMINDER_FROM_EMAIL ||
          `${SITE.founderName} from RenewalPilot <onboarding@resend.dev>`,
        to,
        subject,
        text,
        html: textToHtml(text),
        replyTo: SITE.contactEmail,
        reply_to: SITE.contactEmail,
      }

      try {
        const { error: sendError } = await resend.emails.send(payload as never)
        if (sendError) {
          results.push({ org: org.name, day, step: chosen.key, error: sendError.message })
        } else {
          newSent.push(chosen.key)
          results.push({ org: org.name, day, sent: chosen.key, to })
        }
      } catch (e) {
        results.push({ org: org.name, day, step: chosen.key, error: (e as Error).message })
      }
      await sleep(600)
    }

    if (newSent.length !== alreadySent.size) {
      await supabaseAdmin
        .from('organizations')
        .update({ trial_emails_sent: [...new Set(newSent)] })
        .eq('id', org.id)
    }
  }

  return NextResponse.json({ dryRun, checked: orgs.length, results })
}