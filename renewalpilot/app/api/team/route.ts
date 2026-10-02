import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin, getOrgFromRequest } from '@/lib/supabaseAdmin'
import { buildInviteEmail } from '@/lib/inviteEmail'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

function appUrl() {
  return (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://renewalpilot-eta.vercel.app'
  ).replace(/\/$/, '')
}

async function getMembers(orgId: string, myId: string) {
  const { data: profiles, error } = await supabaseAdmin
    .from('profiles')
    .select('user_id, name, role')
    .eq('organization_id', orgId)

  if (error) throw error

  const members = await Promise.all(
    (profiles || []).map(
      async (p: { user_id: string; name: string | null; role: string | null }) => {
        const { data } = await supabaseAdmin.auth.admin.getUserById(p.user_id)
        return {
          userId: p.user_id,
          name: p.name || '',
          email: (data?.user?.email || '').toLowerCase(),
          role: p.role === 'member' ? 'member' : 'owner',
          isYou: p.user_id === myId,
        }
      }
    )
  )

  // Owners first
  return members.sort((a, b) => (a.role === b.role ? 0 : a.role === 'owner' ? -1 : 1))
}

export async function POST(req: NextRequest) {
  const auth = await getAuth(req)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = auth.organizationId
  const myId = auth.user.id
  const body = await req.json().catch(() => ({}))
  const action = body.action as string

  try {
    const members = await getMembers(orgId, myId)
    const me = members.find((m) => m.isYou)
    const isOwner = me?.role === 'owner'

    // ---------- LIST ----------
    if (action === 'list') {
      const { data: invites } = await supabaseAdmin
        .from('invites')
        .select('id, email, token, created_at')
        .eq('organization_id', orgId)
        .is('accepted_at', null)
        .order('created_at', { ascending: true })

      return NextResponse.json({ members, invites: invites || [], isOwner })
    }

    // ---------- INVITE (anyone on the team) ----------
    if (action === 'invite') {
      const email = String(body.email || '').trim().toLowerCase()
      if (!EMAIL_RE.test(email)) {
        return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
      }
      if (members.some((m) => m.email === email)) {
        return NextResponse.json({ error: 'That person is already on your team.' }, { status: 400 })
      }

      const { data: invite, error: insertError } = await supabaseAdmin
        .from('invites')
        .insert({ organization_id: orgId, email, invited_by: myId })
        .select('id, email, token, created_at')
        .single()

      if (insertError) {
        if (insertError.code === '23505') {
          return NextResponse.json({ error: 'That email already has a pending invite.' }, { status: 409 })
        }
        throw insertError
      }

      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('name')
        .eq('id', orgId)
        .single()

      const inviterName = me?.name || me?.email || 'A teammate'
      const orgName = org?.name || 'your team'
      const link = `${appUrl()}/join/${invite.token}`
      const { subject, html } = buildInviteEmail({ orgName, inviterName, link })

      let emailSent = false
      try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        const { error: sendError } = await resend.emails.send({
          from: process.env.REMINDER_FROM_EMAIL || 'RenewalPilot <onboarding@resend.dev>',
          to: process.env.REMINDER_TEST_EMAIL || email,
          subject,
          html,
        })
        emailSent = !sendError
        if (sendError) console.error('[team] invite email failed', sendError)
      } catch (e) {
        console.error('[team] invite email failed', e)
      }

      return NextResponse.json({ invite, emailSent })
    }

    // ---------- CANCEL INVITE (owner only) ----------
    if (action === 'cancel') {
      if (!isOwner) {
        return NextResponse.json({ error: 'Only the owner can cancel invites.' }, { status: 403 })
      }
      const { error } = await supabaseAdmin
        .from('invites')
        .delete()
        .eq('id', String(body.inviteId || ''))
        .eq('organization_id', orgId)
        .is('accepted_at', null)

      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    // ---------- REMOVE MEMBER (owner only, can't remove owners) ----------
    if (action === 'remove') {
      if (!isOwner) {
        return NextResponse.json({ error: 'Only the owner can remove teammates.' }, { status: 403 })
      }
      const userId = String(body.userId || '')
      const target = members.find((m) => m.userId === userId)
      if (!target) {
        return NextResponse.json({ error: 'Teammate not found.' }, { status: 404 })
      }
      if (target.isYou || target.role === 'owner') {
        return NextResponse.json({ error: "The owner can't be removed." }, { status: 400 })
      }

      const { error } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('user_id', userId)
        .eq('organization_id', orgId)

      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    console.error('[team]', e)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}