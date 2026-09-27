'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { getCurrentOrganizationId } from '../../lib/getOrganization'

// Display info only. The real prices live in Stripe + lib/stripe.ts.
const PLANS = [
  { key: 'starter',  name: 'Starter',  price: 49,  description: 'Small team / limited tracked requirements' },
  { key: 'business', name: 'Business', price: 99,  description: 'More employees, workflows, assignments and reporting' },
  { key: 'pro',      name: 'Pro',      price: 199, description: 'Larger teams, advanced automation and integrations' },
] as const

type Org = {
  plan: string
  subscription_status: string
  current_period_end: string | null
}

export default function BillingPage() {
  const [org, setOrg] = useState<Org | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyPlan, setBusyPlan] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  useEffect(() => {
    // Show a banner after returning from Stripe
    const params = new URLSearchParams(window.location.search)
    if (params.get('success')) {
      setMessage({ type: 'success', text: 'Payment received! Your plan will update in a few seconds.' })
    } else if (params.get('canceled')) {
      setMessage({ type: 'info', text: 'Checkout canceled. You have not been charged.' })
    }

    async function load() {
      const orgId = await getCurrentOrganizationId()
      if (!orgId) {
        setLoading(false)
        return
      }
      const { data } = await supabase
        .from('organizations')
        .select('plan, subscription_status, current_period_end')
        .eq('id', orgId)
        .single()
      setOrg(data)
      setLoading(false)
    }
    load()
  }, [])

  async function subscribe(plan: string) {
    setBusyPlan(plan)
    setMessage(null)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setMessage({ type: 'error', text: 'Please log in first.' })
      setBusyPlan(null)
      return
    }

    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ plan }),
    })
    const json = await res.json()

    if (!res.ok) {
      setMessage({ type: 'error', text: json.error || 'Something went wrong.' })
      setBusyPlan(null)
      return
    }

    window.location.href = json.url // off to Stripe
  }

  const isSubscribed = org && ['active', 'trialing', 'past_due'].includes(org.subscription_status)

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-2">Billing</h1>
      <p className="text-gray-600 mb-6">
        {loading
          ? 'Loading your plan…'
          : org
            ? <>Current plan: <span className="font-semibold capitalize">{org.plan}</span>
                {' '}· Status: <span className="font-semibold">{org.subscription_status}</span>
                {org.current_period_end && <> · Renews {new Date(org.current_period_end).toLocaleDateString()}</>}
              </>
            : 'Could not load your organization.'}
      </p>

      {message && (
        <div
          className={`mb-6 rounded-lg px-4 py-3 text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200'
            : message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200'
            : 'bg-blue-50 text-blue-800 border border-blue-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {PLANS.map((p) => {
          const isCurrent = org?.plan === p.key && isSubscribed
          return (
            <div
              key={p.key}
              className={`rounded-xl border p-6 flex flex-col ${isCurrent ? 'border-blue-600 ring-2 ring-blue-600' : 'border-gray-200'}`}
            >
              <h2 className="text-xl font-semibold">{p.name}</h2>
              <p className="mt-2">
                <span className="text-4xl font-bold">${p.price}</span>
                <span className="text-gray-500">/month</span>
              </p>
              <p className="mt-3 text-sm text-gray-600 flex-1">{p.description}</p>
              <button
                onClick={() => subscribe(p.key)}
                disabled={!!busyPlan || !!isSubscribed}
                className="mt-6 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCurrent ? 'Current plan' : busyPlan === p.key ? 'Redirecting…' : `Subscribe to ${p.name}`}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}