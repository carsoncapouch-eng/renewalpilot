import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function daysUntil(dateStr: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function reminderThreshold(schedule: string) {
  const match = schedule.match(/\d+/)
  return match ? parseInt(match[0], 10) : 30
}

export async function POST() {
  const { data: requirements, error } = await supabase.from('requirements').select('*')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let updated = 0

  for (const req of requirements || []) {
    if (!req.expiration_date) continue

    const days = daysUntil(req.expiration_date)
    const threshold = reminderThreshold(req.reminder_schedule || '30 days before')

    let status = 'active'
    if (days < 0) status = 'overdue'
    else if (days === 0) status = 'expired'
    else if (days <= threshold) status = 'expiring_soon'

    if (status !== req.status) {
      await supabase.from('requirements').update({ status }).eq('id', req.id)
      updated++
    }
  }

  return NextResponse.json({ checked: requirements?.length || 0, updated })
} 