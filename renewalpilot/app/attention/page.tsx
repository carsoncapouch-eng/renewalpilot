'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getCurrentOrganizationId } from '@/lib/getOrganization'

type Requirement = {
  id: string
  name: string
  expiration_date: string | null
  status: string | null
  employee_id: string | null
  responsible_name: string | null
  employees: { name: string } | null
}

type Pending = {
  id: string
  file_url: string
  uploaded_at: string
  requirement_id: string | null
  extracted: { expiration_date?: string | null; confidence?: number } | null
  requirements: { name: string; expiration_date: string | null; responsible_name: string | null; employees: { name: string } | null } | null
}

const smallButton: React.CSSProperties = {
  padding: '0.4rem 0.75rem', fontSize: '0.82rem', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap',
}

function daysUntil(date: string) {
  const today = new Date().toISOString().slice(0, 10)
  return Math.round((Date.parse(date.slice(0, 10)) - Date.parse(today)) / 86_400_000)
}

function prettyDate(date: string) {
  return new Date(date.slice(0, 10) + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

function whenLabel(date: string | null) {
  if (!date) return 'No expiration date on file'
  const days = daysUntil(date)
  const pretty = prettyDate(date)
  if (days < 0) return `Expired ${-days} day${days === -1 ? '' : 's'} ago · ${pretty}`
  if (days === 0) return `Expires today · ${pretty}`
  if (days === 1) return `Expires tomorrow · ${pretty}`
  return `Expires in ${days} days · ${pretty}`
}

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`
  const days = Math.round(hrs / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

// Older rows stored a full public URL; newer rows store just the storage path.
function storagePath(url: string) {
  const marker = '/object/public/documents/'
  const i = url.indexOf(marker)
  return i === -1 ? url : decodeURIComponent(url.slice(i + marker.length))
}

function statusForDate(date: string) {
  const days = daysUntil(date)
  if (days < 0) return 'overdue'
  if (days === 0) return 'expired'
  if (days <= 30) return 'expiring_soon'
  return 'active'
}

function personFor(req: { employees: { name: string } | null; responsible_name: string | null } | null) {
  return req?.employees?.name || req?.responsible_name || 'Company-wide'
}

export default function AttentionPage() {
  const router = useRouter()
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [withDocument, setWithDocument] = useState<Set<string>>(new Set())
  const [pending, setPending] = useState<Pending[]>([])
  const [reviewDates, setReviewDates] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function loadData() {
    const organizationId = await getCurrentOrganizationId()
    if (!organizationId) {
      setLoading(false)
      return
    }

    // All requirements except paused ones (inactive employees)
    const { data: reqs } = await supabase
      .from('requirements')
      .select('*, employees(name)')
      .eq('organization_id', organizationId)
      .or('status.is.null,status.neq.paused')
      .order('expiration_date')

    // Which requirements have a current, approved document on file
    const { data: docs } = await supabase
      .from('documents')
      .select('requirement_id')
      .eq('organization_id', organizationId)
      .eq('archived', false)
      .eq('status', 'approved')
      .not('requirement_id', 'is', null)

    const { data: pend } = await supabase
      .from('documents')
      .select('id, file_url, uploaded_at, requirement_id, extracted, requirements(name, expiration_date, responsible_name, employees(name))')
      .eq('organization_id', organizationId)
      .eq('status', 'pending_review')
      .order('uploaded_at')

    const pendingList = (pend ?? []) as unknown as Pending[]
    setRequirements((reqs ?? []) as Requirement[])
    setWithDocument(new Set((docs ?? []).map(d => d.requirement_id as string)))
    setPending(pendingList)
    // Pre-fill each review box with the date AI found
    setReviewDates(Object.fromEntries(pendingList.map(p => [p.id, p.extracted?.expiration_date?.slice(0, 10) ?? ''])))
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  async function viewFile(url: string) {
    const tab = window.open('', '_blank')
    const { data, error } = await supabase.storage.from('documents').createSignedUrl(storagePath(url), 60)
    if (error || !data) { tab?.close(); alert('Could not open this file.'); return }
    if (tab) tab.location.href = data.signedUrl
    else window.location.href = data.signedUrl
  }

  async function approve(p: Pending) {
    const newDate = reviewDates[p.id]
    if (!newDate) { alert('Enter the new expiration date before approving.'); return }
    if (!p.requirement_id) { alert('This document isn’t linked to a requirement.'); return }

    setBusyId(p.id)
    // 1. Archive the old document(s) for this requirement
    await supabase.from('documents').update({ archived: true }).eq('requirement_id', p.requirement_id).neq('id', p.id)
    // 2. Mark this upload as approved and remember its expiration date
    const { error: docError } = await supabase.from('documents').update({ status: 'approved', expiration_date: newDate }).eq('id', p.id)
    // 3. Update the requirement and start a fresh cycle with a new upload link
    const { error: reqError } = await supabase
      .from('requirements')
      .update({
        expiration_date: newDate,
        status: statusForDate(newDate),
        last_reminder_date: null,
        upload_token: crypto.randomUUID(),
      })
      .eq('id', p.requirement_id)

    if (docError || reqError) {
      alert(`Couldn't approve: ${(docError || reqError)!.message}`)
      setBusyId(null)
      return
    }
    setBusyId(null)
    loadData()
  }

  async function reject(p: Pending) {
    const name = p.requirements?.name ?? 'this document'
    if (!window.confirm(`Reject the uploaded ${name}?\n\nThe file will be deleted and reminders will continue so they can upload again.`)) return

    setBusyId(p.id)
    await supabase.storage.from('documents').remove([storagePath(p.file_url)])
    const { error } = await supabase.from('documents').delete().eq('id', p.id)
    if (error) { alert(`Couldn't reject: ${error.message}`); setBusyId(null); return }
    setPending(list => list.filter(x => x.id !== p.id))
    setBusyId(null)
  }

  async function handleDelete(req: Requirement) {
    const { count } = await supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('requirement_id', req.id)

    const who = personFor(req)
    const message = count
      ? `Delete "${req.name}" for ${who}?\n\nThis will also permanently remove ${count} document${count === 1 ? '' : 's'}. This can't be undone.`
      : `Delete "${req.name}" for ${who}? This can't be undone.`
    if (!window.confirm(message)) return

    setBusyId(req.id)
    const { error: docError } = await supabase.from('documents').delete().eq('requirement_id', req.id)
    if (docError) { alert(`Couldn't delete documents: ${docError.message}`); setBusyId(null); return }
    const { error } = await supabase.from('requirements').delete().eq('id', req.id)
    if (error) { alert(`Couldn't delete requirement: ${error.message}`); setBusyId(null); return }

    setRequirements(list => list.filter(r => r.id !== req.id))
    setBusyId(null)
  }

  const pendingReqIds = new Set(pending.map(p => p.requirement_id))
  const overdue = requirements.filter(r => r.status === 'overdue' || r.status === 'expired')
  const expiringSoon = requirements.filter(r => r.status === 'expiring_soon')
  // Not urgent yet, but we have no document on file (and none waiting for review)
  const missing = requirements.filter(r =>
    r.status !== 'overdue' && r.status !== 'expired' && r.status !== 'expiring_soon' &&
    !withDocument.has(r.id) && !pendingReqIds.has(r.id)
  )

  function renderRow(req: Requirement, accent: string) {
    const uploaded = pendingReqIds.has(req.id)
    const noDoc = !withDocument.has(req.id) && !uploaded
    return (
      <div
        key={req.id}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap',
          padding: '0.9rem 1.1rem', background: 'var(--surface)', border: '1px solid var(--line)',
          borderLeft: `4px solid ${accent}`, borderRadius: 10, marginBottom: 8,
          opacity: busyId === req.id ? 0.4 : 1,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
            {req.name}
            <span style={{ fontWeight: 400, color: 'var(--ink-soft)' }}> · {personFor(req)}</span>
            {uploaded && (
              <span style={{ marginLeft: 8, fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: 'var(--signal-green-bg)', color: 'var(--signal-green)' }}>
                Renewal uploaded
              </span>
            )}
            {noDoc && (
              <span style={{ marginLeft: 8, fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--ink-soft)' }}>
                No document
              </span>
            )}
          </div>
          <div style={{ color: 'var(--ink-soft)', fontSize: '0.84rem', marginTop: 2 }}>{whenLabel(req.expiration_date)}</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => router.push(`/documents?requirement=${req.id}`)}
            style={{ ...smallButton, background: 'var(--accent)', color: '#fff', border: '1px solid var(--accent)' }}
          >
            {noDoc ? 'Upload document' : 'Upload renewal'}
          </button>
          <button
            onClick={() => handleDelete(req)}
            disabled={busyId === req.id}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--signal-red-bg)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
            style={{ ...smallButton, background: 'none', border: 'none', color: 'var(--signal-red)' }}
          >
            {busyId === req.id ? 'Deleting…' : 'Delete'}
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

  const nothingToShow = pending.length === 0 && overdue.length === 0 && expiringSoon.length === 0 && missing.length === 0

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '2.5rem 1.75rem 4rem' }}>
      <h1 style={{ fontSize: '1.75rem', margin: '0 0 0.35rem' }}>Attention</h1>
      <p style={{ color: 'var(--ink-soft)', margin: '0 0 1.75rem', fontSize: '0.95rem' }}>What needs your attention right now.</p>

      {nothingToShow && (
        <div style={{ background: 'var(--signal-green-bg)', border: '1px solid var(--line)', borderRadius: 12, padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>✓</div>
          <div style={{ fontWeight: 600, color: 'var(--signal-green)' }}>Everything’s on track</div>
          <div style={{ color: 'var(--ink-soft)', fontSize: '0.9rem', marginTop: 4 }}>Every requirement has a current document, and nothing is expiring soon.</div>
        </div>
      )}

      {/* Ready for review */}
      {pending.length > 0 && (
        <section style={{ marginBottom: '1.75rem' }}>
          <h2 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--signal-green)', margin: '0 0 0.6rem' }}>
            Ready for review ({pending.length})
          </h2>
          {pending.map(p => {
            const conf = p.extracted?.confidence
            const oldDate = p.requirements?.expiration_date
            return (
              <div
                key={p.id}
                style={{
                  padding: '1rem 1.1rem', background: 'var(--surface)', border: '1px solid var(--line)',
                  borderLeft: '4px solid var(--signal-green)', borderRadius: 10, marginBottom: 8,
                  opacity: busyId === p.id ? 0.4 : 1,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                      {p.requirements?.name ?? 'Document'}
                      <span style={{ fontWeight: 400, color: 'var(--ink-soft)' }}> · {personFor(p.requirements)}</span>
                    </div>
                    <div style={{ color: 'var(--ink-soft)', fontSize: '0.84rem', marginTop: 2 }}>
                      Uploaded {timeAgo(p.uploaded_at)}{oldDate ? ` · Current expiration ${prettyDate(oldDate)}` : ''}
                    </div>
                  </div>
                  <button onClick={() => viewFile(p.file_url)} style={{ ...smallButton, background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--ink)', alignSelf: 'flex-start' }}>
                    View document
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap', background: 'var(--paper)', borderRadius: 8, padding: '0.75rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--ink-soft)' }}>
                    New expiration date{conf != null ? ` (AI ${Math.round(conf * 100)}% sure)` : ''}
                    <input
                      type="date"
                      value={reviewDates[p.id] ?? ''}
                      onChange={e => setReviewDates(d => ({ ...d, [p.id]: e.target.value }))}
                      style={{ display: 'block', marginTop: 4, padding: '0.5rem 0.65rem', fontSize: '0.92rem' }}
                    />
                  </label>
                  <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                    <button
                      onClick={() => reject(p)}
                      disabled={busyId === p.id}
                      style={{ ...smallButton, background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--signal-red)' }}
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => approve(p)}
                      disabled={busyId === p.id}
                      style={{ ...smallButton, background: 'var(--signal-green)', border: '1px solid var(--signal-green)', color: '#fff', fontWeight: 600 }}
                    >
                      {busyId === p.id ? 'Saving…' : 'Approve'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </section>
      )}

      {section('Overdue', overdue, 'var(--signal-red)')}
      {section('Expiring soon', expiringSoon, 'var(--signal-amber)')}
      {section('No document on file', missing, 'var(--ink-soft)')}
    </main>
  )
}