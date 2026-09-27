import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin, getOrgFromRequest } from '@/lib/supabaseAdmin'

// Sends a subscriber to Stripe's hosted portal (switch plan, update card, cancel, invoices)
export async function POST(req: Request) {
  const auth = await getOrgFromRequest(req)
  if (!auth) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('stripe_customer_id')
    .eq('id', auth.organizationId)
    .single()

  if (!org?.stripe_customer_id) {
    return NextResponse.json({ error: 'No billing account yet. Choose a plan first.' }, { status: 400 })
  }

  const origin = process.env.APP_URL ?? req.headers.get('origin') ?? new URL(req.url).origin

  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripe_customer_id,
    return_url: `${origin}/billing`,
  })

  return NextResponse.json({ url: session.url })
}