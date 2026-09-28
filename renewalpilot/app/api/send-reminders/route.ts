import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin, getOrgFromRequest } from '@/lib/supabaseAdmin'
import { buildEmail } from '@/lib/reminderEmail'

const resend = new Resend(process.env.RESEND_API_KEY)

// Emails the LOGGED-IN user (only them) a reminder for each expiring,
// expired or overdue requirement in their organization.
export async function POST(req: Request) {
  const auth = await getOrgFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const to = auth.user.email
  if (!to) return NextResponse.json({ error: 'Your account has no email address' }, { status: 400 })

  const { data: requirements, error } = await supabaseAdmin
    .from('requirements')
    .select('id, name, expiration_date, status, employees(name)')
    .eq('organization_id', auth.organizationId)
    .in('status', ['expiring_soon', 'expired', 'overdue'])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const today = new Date().toISOString().slice(0, 10)
  const appUrl = process.env.APP_URL ?? new URL(req.url).origin
  let sent = 0

  for (const r of requirements ?? []) {
    if (!r.expiration_date) continue
    const days = Math.round((Date.parse(r.expiration_date.slice(0, 10)) - Date.parse(today)) / 86_400_000)
    const emp = (Array.isArray(r.employees) ? r.employees[0] : r.employees) as { name?: string } | null

    const { subject, html } = buildEmail({
      name: r.name,
      person: emp?.name || 'Unassigned',
      expiration: r.expiration_date,
      days,
      link: `${appUrl}/documents?requirement=${r.id}`,
    })

    const { error: sendError } = await resend.emails.send({
      from: process.env.REMINDER_FROM_EMAIL ?? 'RenewalPilot <onboarding@resend.dev>',
      to: [to],
      subject,
      html,
    })
    if (!sendError) sent++
    await new Promise(res => setTimeout(res, 600)) // stay under Resend's rate limit
  }

  return NextResponse.json({ sent, to })
}