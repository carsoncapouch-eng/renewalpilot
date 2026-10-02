'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getCurrentOrganizationId } from '@/lib/getOrganization'
import { accessState, trialDaysLeft, employeeLimit, PLAN_EMPLOYEE_LIMITS } from '@/lib/access'

// Display info only. Real prices live in Stripe + lib/stripe.ts.
const PLANS = [
  { key: 'starter',  name: 'Starter',  price: 49,  description: 'For small teams getting their renewals under control.', popular: false },
  { key: 'business', name: 'Business', price: 99,  description: 'For growing teams with more people to keep compliant.', popular: true },
  { key: 'pro',      name: 'Pro',      price: 199, description: 'For larger companies that need room to grow.', popular: false },
] as const

type Org = {
  plan: string | null
  subscription_status: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean | null
  trial_ends_at: string | null
}
type Message = { type: 'success' | 'error' | 'info'; text: string }

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  active:   { label: 'Active',        color: 'var(--signal-green)', bg: 'var(--signal-green-bg)' },
  trialing: { label: 'Active',        color: 'var(--signal-green)', bg: 'var(--signal-green-bg)' },
  past_due: { label: 'Payment issue', color: 'var(--signal-amber)', bg: 'var(--signal-amber-bg)' },
}
const ENDING_STATUS = { label: 'Ending', color: 'var(--signal-amber)', bg: 'var(--signal-amber-bg)' }
const TRIAL_STATUS = { label: 'Free trial', color: 'var(--signal-green)', bg: 'var(--signal-green-bg)' }
const EXPIRED_STATUS = { label: 'Trial ended', color: 'var(--signal-red)', bg: 'var(--signal-red-bg)' }

const BANNER: Record<Message['type'], { color: string; bg: string }> = {
  success: { color: 'var(--signal-green)', bg: 'var(--signal-green-bg)' },
  error:   { color: 'var(--signal-red)',   bg: 'var(--signal-red-bg)' },
  info:    { color: 'var(--accent)',       bg: 'var(--surface)' },
}

const card: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '1.5rem',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
}

function limitText(limit: number | null) {
  return limit === null ? 'Unlimited employees' : `Up to ${limit} active employees`
}

// POST to one of our billing API routes with the user's login token
async function authedPost(url: string, body: object = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Please log in again.')
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Something went wrong. Please try again.')
  return json as { url: string }
}

export default function BillingPage() {
  const [org, setOrg] = useState<Org | null>(null)
  const [activeEmployees, setActiveEmployees] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<Message | null>(null)

  async function loadOrg() {
    const orgId = await getCurrentOrganizationId()
    if (orgId) {
      const { data } = await supabase
        .from('organizations')
        .select('plan, subscription_status, current_period_end, cancel_at_period_end, trial_ends_at')
        .eq('id', orgId)
        .single()
      setOrg(data)

      const { count } = await supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .or('active.is.null,active.eq.true')
      setActiveEmployees(count ?? 0)
    }
    setLoading(false)
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('success')) {
      setMessage({ type: 'success', text: 'Payment received — welcome aboard! Your plan is being activated.' })
      setTimeout(loadOrg, 3000) // give Stripe's webhook a moment, then refresh
    } else if (params.get('canceled')) {
      setMessage({ type: 'info', text: 'Checkout canceled. You have not been charged.' })
    }
    if (params.toString()) window.history.replaceState(null, '', '/billing')
    loadOrg()
  }, [])

  async function subscribe(plan: string) {
    setBusy(plan); setMessage(null)
    try {
      const { url } = await authedPost('/api/billing/checkout', { plan })
      window.location.href = url
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message }); setBusy(null)
    }
  }

  async function openPortal() {
    setBusy('portal'); setMessage(null)
    try {
      const { url } = await authedPost('/api/billing/portal')
      window.location.href = url
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message }); setBusy(null)
    }
  }

  const access = accessState(org)
  const isSubscribed = access === 'paid'
  const isEnding = isSubscribed && !!org?.cancel_at_period_end
  const daysLeft = trialDaysLeft(org)
  const limit = employeeLimit(org)

  const status = isSubscribed
    ? isEnding ? ENDING_STATUS : (STATUS[org!.subscription_status || ''] ?? STATUS.active)
    : access === 'trial' ? TRIAL_STATUS : EXPIRED_STATUS

  const currentPlanName = isSubscribed
    ? (PLANS.find(p => p.key === org!.plan)?.name ?? 'Paid plan')
    : access === 'trial' ? 'Free trial' : 'No plan'

  let summary = ''
  if (isSubscribed && org?.current_period_end) {
    summary = isEnding
      ? `Cancels on ${formatDate(org.current_period_end)}. You’ll keep full access until then.`
      : `Renews on ${formatDate(org.current_period_end)}`
  } else if (access === 'trial') {
    summary = `${daysLeft} day${daysLeft === 1 ? '' : 's'} left${org?.trial_ends_at ? ` (ends ${formatDate(org.trial_ends_at)})` : ''}. Everything is unlocked. Choosing a plan starts billing right away.`
  } else {
    summary = 'Your free trial has ended. Your data is safe, but adding things and reminder emails are paused until you choose a plan.'
  }

  return (
    <main style={{ maxWidth: 1040, margin: '0 auto', padding: '2.5rem 1.75rem 4rem' }}>
      <h1 style={{ fontSize: '1.75rem', margin: '0 0 0.35rem' }}>Billing</h1>
      <p style={{ color: 'var(--ink-soft)', margin: '0 0 1.75rem', fontSize: '0.95rem' }}>
        Manage your RenewalPilot plan and payment details.
      </p>

      {message && (
        <div style={{
          padding: '0.85rem 1rem', borderRadius: 10, marginBottom: '1.5rem', fontSize: '0.9rem',
          border: '1px solid var(--line)', color: BANNER[message.type].color, background: BANNER[message.type].bg,
        }}>
          {message.text}
        </div>
      )}

      {/* Current plan summary */}
      <section style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
        <div>
          <p style={{ margin: '0 0 0.35rem', fontSize: '0.75rem', color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
            Current plan
          </p>
          {loading ? (
            <p style={{ margin: 0, color: 'var(--ink-soft)' }}>Loading…</p>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{currentPlanName}</h2>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '3px 10px', borderRadius: 999, color: status.color, background: status.bg, border: '1px solid var(--line)' }}>
                  {status.label}
                </span>
              </div>
              <p style={{
                margin: '0.4rem 0 0', fontSize: '0.88rem',
                color: access === 'expired' ? 'var(--signal-red)' : isEnding ? 'var(--signal-amber)' : 'var(--ink-soft)',
              }}>
                {summary}
              </p>
              {activeEmployees !== null && (
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.88rem', color: 'var(--ink-soft)' }}>
                  Active employees: <strong style={{ color: 'var(--ink)' }}>{activeEmployees}</strong>
                  {isSubscribed && ` of ${limit === null ? 'unlimited' : limit}`}
                </p>
              )}
              {org?.subscription_status === 'past_due' && (
                <p style={{ margin: '0.5rem 0 0', color: 'var(--signal-amber)', fontSize: '0.85rem', fontWeight: 500 }}>
                  Your last payment didn’t go through. Update your card in Manage billing.
                </p>
              )}
            </>
          )}
        </div>
        {isSubscribed && (
          <button
            onClick={openPortal}
            disabled={!!busy}
            style={{
              padding: '0.6rem 1.1rem', borderRadius: 8, fontSize: '0.9rem', cursor: busy ? 'wait' : 'pointer',
              border: isEnding ? '1px solid var(--accent)' : '1px solid var(--line)',
              background: isEnding ? 'var(--accent)' : 'var(--surface)',
              color: isEnding ? '#fff' : 'var(--ink)',
            }}
          >
            {busy === 'portal' ? 'Opening…' : isEnding ? 'Keep my plan' : 'Manage billing'}
          </button>
        )}
      </section>

      {/* Plan cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
        {PLANS.map(p => {
          const planLimit = PLAN_EMPLOYEE_LIMITS[p.key] ?? null
          const tooSmall = planLimit !== null && activeEmployees !== null && activeEmployees > planLimit
          const isCurrent = isSubscribed && org?.plan === p.key
          const label = busy === p.key ? 'Redirecting…'
            : isCurrent ? 'Current plan'
            : isSubscribed ? 'Switch plan'
            : `Choose ${p.name}`
          const primary = !isCurrent && (p.popular || !isSubscribed)

          return (
            <div
              key={p.key}
              style={{
                ...card, display: 'flex', flexDirection: 'column', position: 'relative',
                border: isCurrent ? '2px solid var(--accent)' : '1px solid var(--line)',
                boxShadow: p.popular && !isCurrent ? '0 8px 24px rgba(28,37,48,0.08)' : 'none',
              }}
            >
              {(isCurrent || p.popular) && (
                <span style={{
                  position: 'absolute', top: -11, left: '1.5rem', fontSize: '0.7rem', fontWeight: 600,
                  padding: '3px 10px', borderRadius: 999, letterSpacing: '0.03em',
                  background: isCurrent ? 'var(--accent)' : 'var(--ink)', color: '#fff',
                }}>
                  {isCurrent ? 'YOUR PLAN' : 'MOST POPULAR'}
                </span>
              )}
              <h3 style={{ margin: '0.25rem 0 0.75rem', fontSize: '1.1rem' }}>{p.name}</h3>
              <p style={{ margin: 0, display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span className="mono" style={{ fontSize: '2.25rem', fontWeight: 600, letterSpacing: '-0.02em' }}>${p.price}</span>
                <span style={{ color: 'var(--ink-soft)', fontSize: '0.9rem' }}>/ month</span>
              </p>
              <p style={{ margin: '0.85rem 0 0', fontWeight: 600, fontSize: '0.95rem' }}>
                {limitText(planLimit)}
              </p>
              <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem', lineHeight: 1.5, margin: '0.4rem 0 1.25rem', flex: 1 }}>
                {p.description}
              </p>
              {tooSmall && !isCurrent && (
                <p style={{ margin: '0 0 0.85rem', fontSize: '0.8rem', color: 'var(--signal-amber)' }}>
                  You have {activeEmployees} active employees. You won’t be able to add more on this plan.
                </p>
              )}
              <button
                onClick={() => (isSubscribed ? openPortal() : subscribe(p.key))}
                disabled={!!busy || isCurrent}
                style={{
                  padding: '0.7rem 1rem', borderRadius: 8, fontSize: '0.92rem',
                  cursor: isCurrent ? 'default' : busy ? 'wait' : 'pointer',
                  border: primary ? '1px solid var(--accent)' : '1px solid var(--line)',
                  background: primary ? 'var(--accent)' : 'var(--surface)',
                  color: primary ? '#fff' : isCurrent ? 'var(--ink-soft)' : 'var(--ink)',
                  opacity: busy && busy !== p.key ? 0.6 : 1,
                }}
              >
                {label}
              </button>
            </div>
          )
        })}
      </div>

      <p style={{ textAlign: 'center', color: 'var(--ink-soft)', fontSize: '0.85rem', marginTop: '2rem', lineHeight: 1.6 }}>
        Every plan includes AI document reading, automatic reminders, overdue alerts, employee upload links,
        team access and CSV export. Deactivated employees don’t count toward your limit.
        <br />
        Payments are processed securely by Stripe. Cancel anytime.
      </p>
    </main>
  )
}