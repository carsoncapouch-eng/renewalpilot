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

  const cardStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 140,
    padding: '1.25rem',
    borderRadius: 12,
    border: '1px solid #e5e5e5',
    textAlign: 'center',
  }

  if (loading) return <p style={{ textAlign: 'center', marginTop: '4rem' }}>Loading dashboard...</p>

  return (
    <div style={{ maxWidth: 800, margin: '3rem auto', padding: '0 1rem' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>Dashboard</h1>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <div style={cardStyle}><h2>{active.length}</h2><p>Active</p></div>
        <div style={{ ...cardStyle, borderColor: '#f0c040' }}><h2>{expiringSoon.length}</h2><p>Expiring Soon</p></div>
        <div style={{ ...cardStyle, borderColor: '#e05050' }}><h2>{overdue.length}</h2><p>Overdue</p></div>
        <div style={cardStyle}><h2>{missing.length}</h2><p>Missing</p></div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <a href="/requirements" style={{ padding: '0.75rem 1.25rem', background: '#000', color: '#fff', borderRadius: 8, textDecoration: 'none' }}>+ Add Requirement</a>
        <a href="/documents" style={{ padding: '0.75rem 1.25rem', border: '1px solid #000', borderRadius: 8, textDecoration: 'none', color: '#000' }}>Upload Document</a>
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
          style={{ padding: '0.75rem 1.25rem', border: '1px solid #000', borderRadius: 8, background: '#fff', cursor: 'pointer' }}
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
          style={{ padding: '0.75rem 1.25rem', border: '1px solid #000', borderRadius: 8, background: '#fff', cursor: 'pointer' }}
        >
          Send Reminder Emails
        </button>
      </div>
    </div>
  )
}