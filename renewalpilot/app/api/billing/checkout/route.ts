import { NextResponse } from 'next/server'
import { stripe, PLANS, type PlanKey } from '../../../../lib/stripe'
import { supabaseAdmin, getOrgFromRequest } from '../../../../lib/supabaseAdmin'

export async function POST(req: Request) {
  // 1. Who is this? (verified with Supabase, not trusted from the browser)
  const auth = await getOrgFromRequest(req)
  if (!auth) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }
  const { user, organizationId } = auth

  // 2. Which plan did they pick?
  const { plan } = (await req.json()) as { plan: PlanKey }
  if (!plan || !(plan in PLANS)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  // 3. Load their organization
  const { data: org, error: orgError } = await supabaseAdmin
    .from('organizations')
    .select('id, name, stripe_customer_id, subscription_status')
    .eq('id', organizationId)
    .single()

  if (orgError || !org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  // Already paying? Don't create a second subscription.
  if (['active', 'trialing', 'past_due'].includes(org.subscription_status)) {
    return NextResponse.json(
      { error: 'This organization already has a subscription. Use Manage Billing to change plans.' },
      { status: 400 }
    )
  }

  // 4. Make sure the org has a Stripe customer (create once, reuse forever)
  let customerId = org.stripe_customer_id as string | null
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name: org.name ?? undefined,
      metadata: { organization_id: organizationId },
    })
    customerId = customer.id

    await supabaseAdmin
      .from('organizations')
      .update({ stripe_customer_id: customerId })
      .eq('id', organizationId)
  }

  // 5. Create the Stripe Checkout page
  // APP_URL (in .env.local / Vercel) is your app's public address, so Stripe
  // sends people back to the right place instead of "localhost".
  const origin = process.env.APP_URL ?? req.headers.get('origin') ?? new URL(req.url).origin

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: PLANS[plan].priceId, quantity: 1 }],
    success_url: `${origin}/billing?success=1`,
    cancel_url: `${origin}/billing?canceled=1`,
    client_reference_id: organizationId,
    subscription_data: { metadata: { organization_id: organizationId } },
    allow_promotion_codes: true,
  })

  // 6. Send the browser the link to Stripe's payment page
  return NextResponse.json({ url: session.url })
}