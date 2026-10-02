import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  if (!/^[0-9a-f-]{36}$/i.test(token)) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  }

  const { data: invite } = await supabaseAdmin
    .from('invites')
    .select('email, accepted_at, organization_id')
    .eq('token', token)
    .maybeSingle()

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  }

  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('name')
    .eq('id', invite.organization_id)
    .single()

  return NextResponse.json({
    orgName: org?.name || 'a team',
    email: invite.email,
    accepted: !!invite.accepted_at,
  })
}