import { NextResponse } from 'next/server'
import { supabaseAdmin, getOrgFromRequest } from '@/lib/supabaseAdmin'

function daysUntil(expiration: string, today: string) {
  return Math.round((Date.parse(expiration.slice(0, 10)) - Date.parse(today)) / 86_400_000)
}

function firstReminderDays(schedule: string | null) {
  const match = schedule?.match(/\d+/)
  return match ? parseInt(match[0], 10) : 30
}

// Recalculates statuses for the LOGGED-IN user's organization only.
export async function POST(req: Request) {
  const auth = await getOrgFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const { data: requirements, error } = await supabaseAdmin
    .from('requirements')
    .select('id, expiration_date, status, reminder_schedule')
    .eq('organization_id', auth.organizationId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const today = new Date().toISOString().slice(0, 10)
  let updated = 0

  for (const r of requirements ?? []) {
    if (!r.expiration_date) continue
    const days = daysUntil(r.expiration_date, today)
    const threshold = firstReminderDays(r.reminder_schedule)

    let status = 'active'
    if (days < 0) status = 'overdue'
    else if (days === 0) status = 'expired'
    else if (days <= threshold) status = 'expiring_soon'

    if (status !== r.status) {
      await supabaseAdmin.from('requirements').update({ status }).eq('id', r.id)
      updated++
    }
  }

  return NextResponse.json({ checked: requirements?.length ?? 0, updated })
}