'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Requirement = {
  id: string
  name: string
  expiration_date: string | null
  status: string | null
  reminder_schedule: string | null
  upload_token: string | null
  employee_id: string | null
  responsible_name: string | null
  responsible_email: string | null
  employees: { name: string; email: string; active: boolean | null } | null
}

type Doc = {
  id: string
  file_url: string
  uploaded_at: string
  status: string | null
  archived: boolean
  expiration_date: string | null
  submitted_by: string | null
}

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  active:        { label: 'Active',        color: 'var(--signal-green)', bg: 'var(--signal-green-bg)' },
  expiring_soon: { label: 'Expiring soon', color: 'var(--signal-amber)', bg: 'var(--signal-amber-bg)' },
  expired:       { label: 'Expired',       color: 'var(--signal-red)',   bg: 'var(--signal-red-bg)' },
  overdue:       { label: 'Overdue',       color: 'var(--signal-red)',   bg: 'var(--signal-red-bg)' },
  paused:        { label: 'Paused',        color: 'var(--ink-soft)',     bg: 'var(--paper)' },
}

const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }
const button: React.CSSProperties = {
  display: 'inline-block', padding: '0.6rem 1rem', borderRadius: 8, fontSize: '0.9rem', cursor: 'pointer',
  border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', textDecoration: 'none',
}

function day(d: string) {
  return new Date(d.slice(0, 10) + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}
function when(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fileName(url: string) {
  return decodeURIComponent(url.split('/').pop() || 'document').replace(/^\d+-/, '')
}
function storagePath(url: string) {
  const marker = '/object/public/documents/'
  const i = url.indexOf(marker)
  return i === -1 ? url : decodeURIComponent(url.slice(i + marker.length))
}

export default function RequirementDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [req, setReq] = useState<Requirement | null>(null)
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: r } = await supabase
        .from('requirements')
        .select('*, employees(name, email, active)')
        .eq('id', id)
        .maybeSingle()
      const { data: d } = await supabase
        .from('documents')
        .select('id, file_url, uploaded_at, status, archived, expiration_date, submitted_by')
        .eq('requirement_id', id)
        .order('uploaded_at', { ascending: false })
      setReq(r as Requirement | null)
      setDocs((d ?? []) as Doc[])
      setLoading(false)
    }
    load()
  }, [id])

  async function viewFile(url: string) {
    const tab = window.open('', '_blank')
    const { data, error } = await supabase.storage.from('documents').createSignedUrl(storagePath(url), 60)
    if (error || !data) { tab?.close(); alert('Could not open this file.'); return }
    if (tab) tab.location.href = data.signedUrl
    else window.location.href = data.signedUrl
  }

  async function copyLink() {
    if (!req?.upload_token) return
    await navigator.clipboard.writeText(`${window.location.origin}/upload/${req.upload_token}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <p style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--ink-soft)' }}>Loading…</p>

  if (!req) {
    return (
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '2.5rem 1.75rem' }}>
        <p style={{ color: 'var(--ink-soft)' }}>This requirement doesn’t exist or was deleted.</p>
        <Link href="/requirements" style={{ color: 'var(--accent)' }}>← Back to requirements</Link>
      </main>
    )
  }

  const s = STATUS[req.status ?? 'active'] ?? STATUS.active
  const person = req.employees
    ? `${req.employees.name}${req.employees.active === false ? ' (inactive)' : ''}`
    : req.responsible_name || req.responsible_email || 'Company-wide'
  const contact = req.employees?.email ?? req.responsible_email

  const details: [string, string][] = [
    ['Assigned to', person],
    ['Reminder email', contact || '—'],
    ['Expires', req.expiration_date ? day(req.expiration_date) : '—'],
    ['First reminder', req.reminder_schedule || '30 days before'],
  ]

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '2.5rem 1.75rem 4rem' }}>
      <Link href="/requirements" style={{ color: 'var(--ink-soft)', fontSize: '0.85rem', textDecoration: 'none' }}>← Requirements</Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', margin: '1rem 0 1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', margin: 0 }}>{req.name}</h1>
        <span style={{ fontSize: '0.78rem', fontWeight: 600, padding: '3px 10px', borderRadius: 999, color: s.color, background: s.bg, border: '1px solid var(--line)' }}>
          {s.label}
        </span>
        {!req.employee_id && (
          <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--accent)' }}>
            Company
          </span>
        )}
      </div>

      {/* Details */}
      <section style={{ ...card, padding: '0.5rem 1.25rem', marginBottom: '1.25rem' }}>
        {details.map(([label, value], i) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.75rem 0', borderBottom: i === details.length - 1 ? 'none' : '1px solid var(--line)', fontSize: '0.92rem' }}>
            <span style={{ color: 'var(--ink-soft)' }}>{label}</span>
            <span style={{ fontWeight: 500, textAlign: 'right' }}>{value}</span>
          </div>
        ))}
      </section>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <Link href={`/documents?requirement=${req.id}`} style={{ ...button, background: 'var(--accent)', border: '1px solid var(--accent)', color: '#fff' }}>
          Upload document
        </Link>
        {req.upload_token && (
          <button onClick={copyLink} style={button}>
            {copied ? 'Link copied ✓' : 'Copy employee upload link'}
          </button>
        )}
      </div>

      {/* History */}
      <h2 style={{ fontSize: '1rem', margin: '0 0 0.75rem' }}>Document history</h2>
      {docs.length === 0 ? (
        <div style={{ ...card, padding: '1.5rem', color: 'var(--ink-soft)', fontSize: '0.9rem' }}>
          No documents uploaded yet.
        </div>
      ) : (
        <div style={{ ...card, overflow: 'hidden' }}>
          {docs.map((d, i) => {
            const tag = d.status === 'pending_review'
              ? { label: 'Awaiting review', color: 'var(--signal-green)', bg: 'var(--signal-green-bg)' }
              : d.archived
                ? { label: 'Previous', color: 'var(--ink-soft)', bg: 'var(--paper)' }
                : { label: 'Current', color: 'var(--accent)', bg: 'var(--surface)' }
            const meta = [
              d.expiration_date && `Expires ${day(d.expiration_date)}`,
              `Uploaded ${when(d.uploaded_at)}`,
              d.submitted_by === 'upload_link' ? 'via employee link' : 'in the app',
            ].filter(Boolean).join(' · ')
            return (
              <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '0.85rem 1.1rem', borderBottom: i === docs.length - 1 ? 'none' : '1px solid var(--line)', opacity: d.archived ? 0.7 : 1 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {fileName(d.file_url)}
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 999, color: tag.color, background: tag.bg, border: '1px solid var(--line)' }}>
                      {tag.label}
                    </span>
                  </div>
                  <div style={{ color: 'var(--ink-soft)', fontSize: '0.82rem', marginTop: 2 }}>{meta}</div>
                </div>
                <button onClick={() => viewFile(d.file_url)} style={{ ...button, padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}>View</button>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}