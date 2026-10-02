'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { getCurrentOrganizationId } from '@/lib/getOrganization'
import { authedPost } from '@/lib/authedPost'

type Requirement = {
  id: string
  name: string
  expiration_date: string | null
  status: string | null
  responsible_name: string | null
  employees: { name: string } | null
}

const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }
const secondaryButton: React.CSSProperties = {
  display: 'inline-block', padding: '0.6rem 1rem', borderRadius: 8, fontSize: '0.9rem', cursor: 'pointer',
  border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', textDecoration: 'none',
}
const primaryButton: React.CSSProperties = {
  ...secondaryButton, background: 'var(--accent)', border: '1px solid var(--accent)', color: '#fff',
}

function daysUntil(date: string) {
  const today = new Date().toISOString().slice(0, 10)
  return Math.round((Date.parse(date.slice(0, 10)) - Date.parse(today)) / 86_400_000)
}

function prettyDate(date: string) {
  return new Date(date.slice(0, 10) + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

function inDays(date: string) {
  const d = daysUntil(date)
  if (d < 0) return `${-d} day${d === -1 ? '' : 's'} overdue`
  if (d === 0) return 'Today'
  if (d === 1) return 'Tomorrow'
  return `In ${d} days`
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [orgName, setOrgName] = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const [employeeCount, setEmployeeCount] = useState(0)
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [docCount, setDocCount] = useState(0)
  const [withDocument, setWithDocument] = useState<Set<string>>(new Set())
  const [pendingCount, setPendingCount] = useState(0)
  const [pendingReqIds, setPendingReqIds] = useState<Set<string>>(new Set())

  async function load() {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) { setLoading(false); return }

    const [orgRes, empRes, reqRes, docRes, pendRes] = await Promise.all([
      supabase.from('organizations').select('name, subscription_status').eq('id', orgId).single(),
      supabase.from('employees').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).neq('active', false),
      supabase.from('requirements').select('id, name, expiration_date, status, responsible_name, employees(name)')
        .eq('organization_id', orgId).or('status.is.null,status.neq.paused').order('expiration_date'),
      supabase.from('documents').select('requirement_id, status').eq('organization_id', orgId).eq('archived', false),
      supabase.from('documents').select('requirement_id').eq('organization_id', orgId).eq('status', 'pending_review'),
    ])

    setOrgName(orgRes.data?.name ?? '')
    setSubscribed(['active', 'trialing', 'past_due'].includes(orgRes.data?.subscription_status ?? ''))
    setEmployeeCount(empRes.count ?? 0)
    setRequirements((reqRes.data ?? []) as unknown as Requirement[])
    const docs = docRes.data ?? []
    setDocCount(docs.length)
    setWithDocument(new Set(docs.filter(d => d.status === 'approved' && d.requirement_id).map(d => d.requirement_id as string)))
    const pend = pendRes.data ?? []
    setPendingCount(pend.length)
    setPendingReqIds(new Set(pend.map(p => p.requirement_id as string)))
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function refreshStatuses() {
    const res = await authedPost('/api/check-renewals')
    const result = await res.json()
    if (result.error) { alert(`Error: ${result.error}`); return }
    alert(`Checked ${result.checked} requirements, updated ${result.updated} statuses.`)
    load()
  }

  async function emailMe() {
    const res = await authedPost('/api/send-reminders')
    const result = await res.json()
    alert(result.error ? `Error: ${result.error}` : `Sent ${result.sent} reminder email(s) to ${result.to}.`)
  }

  if (loading) return <p style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--ink-soft)' }}>Loading…</p>

  // ── Numbers ───────────────────────────────────────────────
  const overdue = requirements.filter(r => r.status === 'overdue' || r.status === 'expired').length
  const expiring = requirements.filter(r => r.status === 'expiring_soon').length
  const noDocument = requirements.filter(r => !withDocument.has(r.id) && !pendingReqIds.has(r.id)).length
  const onTrack = requirements.filter(r => (r.status === 'active' || !r.status) && withDocument.has(r.id)).length

  const stats = [
    { label: 'Waiting for review', count: pendingCount, color: 'var(--signal-green)', bg: 'var(--signal-green-bg)' },
    { label: 'Overdue', count: overdue, color: 'var(--signal-red)', bg: 'var(--signal-red-bg)' },
    { label: 'Expiring soon', count: expiring, color: 'var(--signal-amber)', bg: 'var(--signal-amber-bg)' },
    { label: 'No document', count: noDocument, color: 'var(--ink-soft)', bg: 'var(--paper)' },
    { label: 'On track', count: onTrack, color: 'var(--signal-green)', bg: 'var(--surface)' },
  ]

  // ── Getting-started checklist ─────────────────────────────
  const steps = [
    { done: employeeCount > 0, title: 'Add your team', text: 'Add the people whose licenses and certifications you track.', href: '/employees', cta: 'Add employees' },
    { done: requirements.length > 0, title: 'Add a requirement', text: 'A license, certification, insurance policy or permit, with its expiration date.', href: '/requirements', cta: 'Add a requirement' },
    { done: docCount > 0, title: 'Upload a document', text: 'Upload the current certificate. AI reads the date for you.', href: '/documents', cta: 'Upload a document' },
    { done: subscribed, title: 'Choose a plan', text: 'Keep reminders running for your whole team.', href: '/billing', cta: 'See plans' },
  ]
  const doneCount = steps.filter(s => s.done).length
  const showChecklist = doneCount < steps.length

  // ── Upcoming renewals (next 5, not yet expired) ───────────
  const upcoming = requirements
    .filter(r => r.expiration_date && daysUntil(r.expiration_date) >= 0)
    .slice(0, 5)

  return (
    <main style={{ maxWidth: 1040, margin: '0 auto', padding: '2.5rem 1.75rem 4rem' }}>
      <h1 style={{ fontSize: '1.75rem', margin: '0 0 0.35rem' }}>{orgName ? `${orgName}` : 'Dashboard'}</h1>
      <p style={{ color: 'var(--ink-soft)', margin: '0 0 1.75rem', fontSize: '0.95rem' }}>
        {requirements.length === 0
          ? 'Welcome to RenewalPilot. Let’s get your renewals set up.'
          : overdue + expiring + pendingCount === 0
            ? 'Everything is on track. Nothing needs your attention right now.'
            : 'Here’s what needs your attention.'}
      </p>

      {/* Getting started */}
      {showChecklist && (
        <section style={{ ...card, padding: '1.5rem', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.05rem', margin: 0 }}>Get started</h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>{doneCount} of {steps.length} done</span>
          </div>
          <div style={{ height: 6, background: 'var(--paper)', borderRadius: 999, overflow: 'hidden', marginBottom: '1.25rem' }}>
            <div style={{ height: '100%', width: `${(doneCount / steps.length) * 100}%`, background: 'var(--signal-green)', borderRadius: 999, transition: 'width 0.3s' }} />
          </div>
          <div style={{ display: 'grid', gap: '0.6rem' }}>
            {steps.map((s, i) => (
              <div
                key={s.title}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.9rem', padding: '0.8rem 1rem', borderRadius: 10,
                  background: s.done ? 'var(--paper)' : 'var(--surface)', border: '1px solid var(--line)',
                }}
              >
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.8rem', fontWeight: 600,
                  background: s.done ? 'var(--signal-green)' : 'var(--surface)',
                  color: s.done ? '#fff' : 'var(--ink-soft)',
                  border: s.done ? 'none' : '1px solid var(--line)',
                }}>
                  {s.done ? '✓' : i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem', textDecoration: s.done ? 'line-through' : 'none', color: s.done ? 'var(--ink-soft)' : 'var(--ink)' }}>
                    {s.title}
                  </div>
                  {!s.done && <div style={{ color: 'var(--ink-soft)', fontSize: '0.84rem', marginTop: 2 }}>{s.text}</div>}
                </div>
                {!s.done && (
                  <Link href={s.href} style={{ ...primaryButton, padding: '0.45rem 0.85rem', fontSize: '0.84rem', whiteSpace: 'nowrap' }}>
                    {s.cta}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        {stats.map(s => (
          <Link
            key={s.label}
            href="/attention"
            style={{ ...card, padding: '1.2rem 1.25rem', textDecoration: 'none', color: 'var(--ink)', borderTop: `3px solid ${s.color}`, background: s.count > 0 ? s.bg : 'var(--surface)' }}
          >
            <div className="mono" style={{ fontSize: '2rem', fontWeight: 600, color: s.count > 0 ? s.color : 'var(--ink-soft)', lineHeight: 1 }}>
              {s.count}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', marginTop: 8 }}>{s.label}</div>
          </Link>
        ))}
      </div>

      {/* Upcoming renewals */}
      <section style={{ ...card, marginBottom: '1.75rem', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1rem', margin: 0 }}>Upcoming renewals</h2>
          <Link href="/requirements" style={{ fontSize: '0.85rem', color: 'var(--accent)' }}>View all</Link>
        </div>
        {upcoming.length === 0 ? (
          <p style={{ padding: '1.5rem 1.25rem', margin: 0, color: 'var(--ink-soft)', fontSize: '0.9rem' }}>
            Nothing coming up. Add a requirement to start tracking.
          </p>
        ) : (
          upcoming.map((r, i) => {
            const d = daysUntil(r.expiration_date!)
            const color = d <= 7 ? 'var(--signal-red)' : d <= 30 ? 'var(--signal-amber)' : 'var(--ink-soft)'
            return (
              <div
                key={r.id}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem',
                  padding: '0.85rem 1.25rem', borderBottom: i === upcoming.length - 1 ? 'none' : '1px solid var(--line)',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: '0.92rem' }}>{r.name}</div>
                  <div style={{ color: 'var(--ink-soft)', fontSize: '0.82rem', marginTop: 2 }}>
                    {r.employees?.name || r.responsible_name || 'Company-wide'} · {prettyDate(r.expiration_date!)}
                  </div>
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color, whiteSpace: 'nowrap' }}>{inDays(r.expiration_date!)}</span>
              </div>
            )
          })
        )}
      </section>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <Link href="/requirements" style={primaryButton}>+ Add requirement</Link>
        <Link href="/documents" style={secondaryButton}>Upload document</Link>
        <button onClick={refreshStatuses} style={secondaryButton}>Refresh statuses</button>
        <button onClick={emailMe} style={secondaryButton}>Email me reminders</button>
      </div>
    </main>
  )
}