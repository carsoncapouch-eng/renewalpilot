'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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

const smallButton: React.CSSProperties = {
  padding: '0.4rem 0.75rem', fontSize: '0.82rem', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap',
}

function daysUntil(date: string) {
  const today = new Date().toISOString().slice(0, 10)
  return Math.round((Date.parse(date.slice(0, 10)) - Date.parse(today)) / 86_400_000)
}

function whenLabel(date: string | null) {
  if (!date) return 'No expiration date on file'
  const days = daysUntil(date)
  const pretty = new Date(date.slice(0, 10) + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
  if (days < 0) return `Expired ${-days} day${days === -1 ? '' : 's'} ago · ${pretty}`
  if (days === 0) return `Expires today · ${pretty}`
  if (days === 1) return `Expires tomorrow · ${pretty}`
  return `Expires in ${days} days · ${pretty}`
}

export default function AttentionPage() {
  const router = useRouter()
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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
        .or('status.in.(overdue,expired,expiring_soon),expiration_date.is.null')
        .order('expiration_date')
      setRequirements(data || [])
      setLoading(false)
    }
    loadData()
  }, [])

  async function handleDelete(req: Requirement) {
    const { count } = await supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('requirement_id', req.id)

    const who = req.employees?.name || 'Unassigned'
    const message = count
      ? `Delete "${req.name}" for ${who}?\n\nThis will also permanently remove ${count} document${count === 1 ? '' : 's'}. This can't be undone.`
      : `Delete "${req.name}" for ${who}? This can't be undone.`
    if (!window.confirm(message)) return

    setDeletingId(req.id)
    const { error: docError } = await supabase.from('documents').delete().eq('requirement_id', req.id)
    if (docError) { alert(`Couldn't delete documents: ${docError.message}`); setDeletingId(null); return }
    const { error } = await supabase.from('requirements').delete().eq('id', req.id)
    if (error) { alert(`Couldn't delete requirement: ${error.message}`); setDeletingId(null); return }

    setRequirements(list => list.filter(r => r.id !== req.id))
    setDeletingId(null)
  }

  const overdue = requirements.filter(r => r.expiration_date && (r.status === 'overdue' || r.status === 'expired'))
  const expiringSoon = requirements.filter(r => r.expiration_date && r.status === 'expiring_soon')
  const missing = requirements.filter(r => !r.expiration_date)

  function renderRow(req: Requirement, accent: string) {
    return (
      <div
        key={req.id}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap',
          padding: '0.9rem 1.1rem', background: 'var(--surface)', border: '1px solid var(--line)',
          borderLeft: `4px solid ${accent}`, borderRadius: 10, marginBottom: 8,
          opacity: deletingId === req.id ? 0.4 : 1,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
            {req.name}
            <span style={{ fontWeight: 400, color: 'var(--ink-soft)' }}> · {req.employees?.name || 'Unassigned'}</span>
          </div>
          <div style={{ color: 'var(--ink-soft)', fontSize: '0.84rem', marginTop: 2 }}>{whenLabel(req.expiration_date)}</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => router.push(`/documents?requirement=${req.id}`)}
            style={{ ...smallButton, background: 'var(--accent)', color: '#fff', border: '1px solid var(--accent)' }}
          >
            Upload renewal
          </button>
          <button
            onClick={() => handleDelete(req)}
            disabled={deletingId === req.id}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--signal-red-bg)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
            style={{ ...smallButton, background: 'none', border: 'none', color: 'var(--signal-red)' }}
          >
            {deletingId === req.id ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    )
  }

  function section(title: string, items: Requirement[], color: string) {
    if (items.length === 0) return null
    return (
      <section style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em', color, margin: '0 0 0.6rem' }}>
          {title} ({items.length})
        </h2>
        {items.map(req => renderRow(req, color))}
      </section>
    )
  }

  if (loading) return <p style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--ink-soft)' }}>Loading…</p>

  const nothingToShow = overdue.length === 0 && expiringSoon.length === 0 && missing.length === 0

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '2.5rem 1.75rem 4rem' }}>
      <h1 style={{ fontSize: '1.75rem', margin: '0 0 0.35rem' }}>Attention</h1>
      <p style={{ color: 'var(--ink-soft)', margin: '0 0 1.75rem', fontSize: '0.95rem' }}>What needs your attention right now.</p>

      {nothingToShow && (
        <div style={{ background: 'var(--signal-green-bg)', border: '1px solid var(--line)', borderRadius: 12, padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>✓</div>
          <div style={{ fontWeight: 600, color: 'var(--signal-green)' }}>Everything’s on track</div>
          <div style={{ color: 'var(--ink-soft)', fontSize: '0.9rem', marginTop: 4 }}>Nothing is expiring soon or overdue.</div>
        </div>
      )}

      {section('Overdue', overdue, 'var(--signal-red)')}
      {section('Expiring soon', expiringSoon, 'var(--signal-amber)')}
      {section('Missing expiration date', missing, 'var(--ink-soft)')}
    </main>
  )
}