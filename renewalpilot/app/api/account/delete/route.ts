import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, getOrgFromRequest } from '@/lib/supabaseAdmin'
import { stripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Auth = { user: { id: string; email?: string }; organizationId: string }

async function getAuth(req: NextRequest): Promise<Auth | null> {
  try {
    const result = (await getOrgFromRequest(req)) as unknown as Auth | null
    if (!result || !result.organizationId || !result.user) return null
    return result
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const auth = await getAuth(req)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = auth.organizationId
  const body = await req.json().catch(() => ({}))
  const confirm = String(body.confirm || '').trim().toLowerCase()

  // Only the owner can do this
  const { data: me } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('user_id', auth.user.id)
    .single()

  if (!me || me.role === 'member') {
    return NextResponse.json({ error: 'Only the owner can delete the company.' }, { status: 403 })
  }

  const { data: org, error: orgError } = await supabaseAdmin
    .from('organizations')
    .select('id, name, stripe_subscription_id, subscription_status')
    .eq('id', orgId)
    .single()

  if (orgError || !org) {
    return NextResponse.json({ error: 'Company not found.' }, { status: 404 })
  }

  if (confirm !== String(org.name || '').trim().toLowerCase()) {
    return NextResponse.json({ error: 'The company name you typed does not match.' }, { status: 400 })
  }

  // 1. Cancel the subscription so they are not charged again
  if (
    org.stripe_subscription_id &&
    !['canceled', 'incomplete_expired'].includes(String(org.subscription_status || ''))
  ) {
    try {
      await stripe.subscriptions.cancel(org.stripe_subscription_id)
    } catch (e) {
      console.error('[delete] stripe cancel failed', e)
    }
  }

  // 2. Delete uploaded files
  try {
    for (let i = 0; i < 50; i++) {
      const { data: files } = await supabaseAdmin.storage
        .from('documents')
        .list(orgId, { limit: 1000 })
      if (!files || files.length === 0) break
      const { error } = await supabaseAdmin.storage
        .from('documents')
        .remove(files.map((f) => `${orgId}/${f.name}`))
      if (error) break
    }
  } catch (e) {
    console.error('[delete] storage cleanup failed', e)
  }

  // 3. Remember who is on the team (to delete their logins at the end)
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('user_id')
    .eq('organization_id', orgId)
  const userIds = (profiles || []).map((p: { user_id: string }) => p.user_id)

  // 4. Delete the data
  const steps: [string, string][] = [
    ['documents', 'documents'],
    ['requirements', 'requirements'],
    ['employees', 'employees'],
    ['invites', 'invites'],
    ['profiles', 'team members'],
  ]

  for (const [table, label] of steps) {
    const { error } = await supabaseAdmin.from(table).delete().eq('organization_id', orgId)
    if (error) {
      console.error(`[delete] ${table}`, error)
      return NextResponse.json(
        { error: `Could not delete ${label}: ${error.message}` },
        { status: 500 }
      )
    }
  }

  const { error: deleteOrgError } = await supabaseAdmin.from('organizations').delete().eq('id', orgId)
  if (deleteOrgError) {
    console.error('[delete] organization', deleteOrgError)
    return NextResponse.json(
      { error: `Could not delete the company: ${deleteOrgError.message}` },
      { status: 500 }
    )
  }

  // 5. Delete everyone's login
  for (const id of userIds) {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
    if (error) console.error('[delete] user', id, error)
  }

  return NextResponse.json({ ok: true })
}