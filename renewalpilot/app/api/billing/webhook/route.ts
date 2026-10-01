import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe, planFromPriceId } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Stripe calls this URL whenever something happens with a payment/subscription.
export async function POST(req: Request) {
  const body = await req.text() // raw body is required to verify the signature
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  // 1. Prove this message really came from Stripe
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.log('[webhook] Signature check failed:', (err as Error).message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // 2. Handle the events we care about
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode === 'subscription' && session.subscription) {
          const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id
          const sub = await stripe.subscriptions.retrieve(subId)
          await syncSubscription(sub)
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        // Always fetch the CURRENT subscription from Stripe, so an old or
        // retried event can never overwrite newer information.
        const eventSub = event.data.object as Stripe.Subscription
        const sub = await stripe.subscriptions.retrieve(eventSub.id)
        await syncSubscription(sub)
        break
      }
      default:
        break
    }
  } catch (err) {
    console.log('[webhook] Error handling', event.type, (err as Error).message)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

// Copies the subscription's current state from Stripe onto the organization row.
async function syncSubscription(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
  const item = sub.items.data[0]
  const isCanceled = sub.status === 'canceled'
  const plan = isCanceled ? 'free' : (planFromPriceId(item?.price.id ?? '') ?? 'free')

  // Newer Stripe API versions keep the period end on the subscription item
  type WithPeriodEnd = { current_period_end?: number }
  const periodEnd =
    (item as unknown as WithPeriodEnd)?.current_period_end ??
    (sub as unknown as WithPeriodEnd).current_period_end

  const update = {
    stripe_customer_id: customerId,
    stripe_subscription_id: isCanceled ? null : sub.id,
    plan,
    subscription_status: sub.status,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    // true when the customer has canceled but still has access until the period ends
    cancel_at_period_end: !isCanceled && (sub.cancel_at_period_end || !!sub.cancel_at),
  }

  const orgId = sub.metadata?.organization_id
  let query = supabaseAdmin.from('organizations').update(update)
  query = orgId ? query.eq('id', orgId) : query.eq('stripe_customer_id', customerId)

  // A cancellation should only downgrade the org if it's for their CURRENT subscription
  if (isCanceled) query = query.eq('stripe_subscription_id', sub.id)

  const { error } = await query
  if (error) throw new Error(`Supabase update failed: ${error.message}`)

  console.log(`[webhook] org ${orgId ?? customerId} → plan: ${plan}, status: ${sub.status}, canceling: ${update.cancel_at_period_end}`)
}