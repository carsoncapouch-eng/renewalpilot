import { NextResponse } from 'next/server'
import { supabaseAdmin, getOrgFromRequest } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

// Saves "How did you hear about us?" and where the visitor came from.
// Only fills in blanks, so the first answer is kept.
export async function POST(req: Request) {
  const auth = await getOrgFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const heardFrom = String(body.heardFrom || '').trim().slice(0, 100)
  const source = String(body.source || '').trim().slice(0, 200)

  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('heard_from, signup_source')
    .eq('id', auth.organizationId)
    .single()

  const update: Record<string, string> = {}
  if (heardFrom && !org?.heard_from) update.heard_from = heardFrom
  if (source && !org?.signup_source) update.signup_source = source

  if (Object.keys(update).length > 0) {
    await supabaseAdmin.from('organizations').update(update).eq('id', auth.organizationId)
  }

  return NextResponse.json({ ok: true })
}