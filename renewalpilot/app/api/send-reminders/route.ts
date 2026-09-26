import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  const { to, organizationId } = await request.json()

  if (!to || !organizationId) {
    return NextResponse.json({ error: 'Missing recipient or organization' }, { status: 400 })
  }

  const { data: requirements, error } = await supabase
    .from('requirements')
    .select('*, employees(name)')
    .eq('organization_id', organizationId)
    .in('status', ['expiring_soon', 'overdue'])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent = 0

  for (const req of requirements || []) {
    const daysRemaining = req.expiration_date
      ? Math.round((new Date(req.expiration_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : null

    const employeeName = req.employees?.name || 'Unassigned'
    const statusLabel = req.status === 'overdue' ? 'OVERDUE' : 'Expiring Soon'
    const renewalLink = `https://${process.env.CODESPACE_NAME}-3000.app.github.dev/documents?requirement=${req.id}`

    await resend.emails.send({
      from: 'RenewalPilot <onboarding@resend.dev>',
      to,
      subject: `[${statusLabel}] ${req.name} — ${employeeName}`,
      html: `
        <h2>RenewalPilot</h2>
        <p><strong>Requirement:</strong> ${req.name}</p>
        <p><strong>Person responsible:</strong> ${employeeName}</p>
        <p><strong>Expiration date:</strong> ${req.expiration_date}</p>
        <p><strong>Days remaining:</strong> ${daysRemaining}</p>
        <p><a href="${renewalLink}">Upload Renewal</a></p>
      `,
    })
    sent++
  }

  return NextResponse.json({ sent })
}