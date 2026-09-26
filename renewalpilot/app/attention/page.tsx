'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getCurrentOrganizationId } from '@/lib/getOrganization'

type Requirement = {
  id: string
  name: string
  expiration_date: string | null
  status: string
  employee_id: string | null
  employees: { name: string } | null
}

export default function AttentionPage() {
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const organizationId = await getCurrentOrganizationId()
      if (!organizationId) {
        setLoading(false)
        return
      }
      const { data } = await supabase
        .from('requirements')
        .select('*, employees(name)')
        .eq('organization_id', organizationId)
        .in('status', ['overdue', 'expiring_soon'])
        .order('expiration_date')
      setRequirements(data || [])
      setLoading(false)
    }
    loadData()
  }, [])

  const overdue = requirements.filter(r => r.status === 'overdue')
  const expiringSoon = requirements.filter(r => r.status === 'expiring_soon')
  const missing = requirements.filter(r => !r.expiration_date)

  function Row({ req }: { req: Requirement }) {
    return (
      <li style={{ padding: '0.75rem 1rem', border: '1px solid #eee', borderRadius: 8, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong>{req.name}</strong>
          <span style={{ color: '#888', marginLeft: 8 }}>
            {req.employees?.name || 'Unassigned'}{req.expiration_date ? ` — expires ${req.expiration_date}` : ''}
          </span>
        </div>
        <a href={`/documents?requirement=${req.id}`} style={{ fontSize: '0.85rem', textDecoration: 'underline' }}>
          Upload Renewal
        </a>
      </li>
    )
  }

  if (loading) return <p style={{ textAlign: 'center', marginTop: '4rem' }}>Loading...</p>

  const nothingToShow = overdue.length === 0 && expiringSoon.length === 0 && missing.length === 0

  return (
    <div style={{ maxWidth: 700, margin: '3rem auto', padding: '0 1rem' }}>
      <h1 style={{ marginBottom: '0.25rem' }}>Attention Center</h1>
      <p style={{ color: '#888', marginTop: 0, marginBottom: '2rem' }}>What needs your attention right now.</p>

      {nothingToShow && <p>Nothing needs attention right now — everything's on track.</p>}

      {overdue.length > 0 && (
        <>
          <h2 style={{ color: '#e05050', fontSize: '1.1rem' }}>Overdue ({overdue.length})</h2>
          <ul style={{ listStyle: 'none', padding: 0, marginBottom: '1.5rem' }}>
            {overdue.map(req => <Row key={req.id} req={req} />)}
          </ul>
        </>
      )}

      {expiringSoon.length > 0 && (
        <>
          <h2 style={{ color: '#c08000', fontSize: '1.1rem' }}>Expiring Soon ({expiringSoon.length})</h2>
          <ul style={{ listStyle: 'none', padding: 0, marginBottom: '1.5rem' }}>
            {expiringSoon.map(req => <Row key={req.id} req={req} />)}
          </ul>
        </>
      )}

      {missing.length > 0 && (
        <>
          <h2 style={{ fontSize: '1.1rem' }}>Missing Documentation ({missing.length})</h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {missing.map(req => <Row key={req.id} req={req} />)}
          </ul>
        </>
      )}
    </div>
  )
}