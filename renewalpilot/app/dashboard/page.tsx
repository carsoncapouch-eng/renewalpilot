'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getCurrentOrganizationId } from '@/lib/getOrganization'

type Requirement = {
  id: string
  name: string
  expiration_date: string | null
  status: string
}

export default function DashboardPage() {
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      const organizationId = await getCurrentOrganizationId()
      setOrgId(organizationId)
      if (!organizationId) {
        setLoading(false)
        return
      }
      const { data } = await supabase.from('requirements').select('*').eq('organization_id', organizationId)
      setRequirements(data || [])
      setLoading(false)
    }
    loadData()
  }, [])

  const today = new Date()
  const in30Days = new Date()
  in30Days.setDate(today.getDate() + 30)

  const overdue = requirements.filter(r => r.expiration_date && new Date(r.expiration_date) < today)
  const expiringSoon = requirements.filter(r => r.expiration_date && new Date(r.expiration_date) >= today && new Date(r.expiration_date) <= in30Days)
  const active = requirements.filter(r => r.expiration_date && new Date(r.expiration_date) > in30Days)
  const missing = requirements.filter(r => !r.expiration_date)

  type Card = { label: string; count: number; color: string; bg: string }
  const cards: Card[] = [
    { label: 'Active', count: active.length, color: 'var(--ink-soft)', bg: 'var(--surface)' },
    { label: 'Expiring Soon', count: expiringSoon.length, color: 'var(--signal-amber)', bg: 'var(--signal-amber-bg)' },
    { label: 'Overdue', count: overdue.length, color: 'var(--signal-red)', bg: 'var(--signal-red-bg)' },
    { label: 'Missing', count: missing.length, color: 'var(--ink-soft)', bg: 'var(--surface)' },
  ]

  const buttonBase: React.CSSProperties = {
    padding: '0.65rem 1.1rem',
    borderRadius: 8,
    fontSize: '0.88rem',
    cursor: 'pointer',
    border: '1px solid var(--line)',
    background: 'var(--surface)',
    color: 'var(--ink)',
    textDecoration: 'none',
  }

  if (loading) return <p style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--ink-soft)' }}>Loading dashboard...</p>

  return (
    <div style={{ maxWidth: 860, margin: '3rem auto', padding: '0 1.5rem' }}>
      <h1 style={{ marginBottom: '0.25rem', fontSize: '1.5rem' }}>Dashboard</h1>
      <p style={{ color: 'var(--ink-soft)', marginTop: 0, marginBottom: '2rem', fontSize: '0.92rem' }}>
        A live view of every renewal across your organization.
      </p>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
        {cards.map(card => (
          <div
            key={card.label}
            style={{
              flex: 1,
              minWidth: 150,
              background: card.bg,
              borderRadius: 10,
              border: '1px solid var(--line)',
              borderLeft: `4px solid ${card.color}`,
              padding: '1.1rem 1.25rem',
            }}
          >
            <div className="mono" style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--ink)', lineHeight: 1 }}>
              {card.count}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', marginTop: 6 }}>{card.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <a href="/requirements" style={{ ...buttonBase, background: 'var(--ink)', color: '#fff', border: 'none' }}>
          + Add Requirement
        </a>
        <a href="/documents" style={buttonBase}>Upload Document</a>
        <button
          onClick={async () => {
            if (!orgId) return
            const res = await fetch('/api/check-renewals', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ organizationId: orgId }),
            })
            const result = await res.json()
            alert(`Checked ${result.checked} requirements, updated ${result.updated} statuses.`)
            window.location.reload()
          }}
          style={buttonBase}
        >
          Check Renewal Statuses
        </button>
        <button
          onClick={async () => {
            if (!orgId) return
            const email = prompt('Send reminder emails to which address?')
            if (!email) return
            const res = await fetch('/api/send-reminders', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ to: email, organizationId: orgId }),
            })
            const result = await res.json()
            alert(result.error ? `Error: ${result.error}` : `Sent ${result.sent} reminder email(s).`)
          }}
          style={buttonBase}
        >
          Send Reminder Emails
        </button>
      </div>
    </div>
  )
}