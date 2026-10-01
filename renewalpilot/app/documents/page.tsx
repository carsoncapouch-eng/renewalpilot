'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getCurrentOrganizationId } from '@/lib/getOrganization'
import { authedPost } from '@/lib/authedPost'

type Employee = { id: string; name: string }
type Requirement = { id: string; name: string }
type Document = {
  id: string
  file_url: string
  document_type: string
  requirement_id: string | null
  employee_id: string | null
  archived: boolean
  uploaded_at: string
  status: string | null
  expiration_date: string | null
}
type Extracted = {
  document_type: string | null
  employee: string | null
  expiration_date: string | null
  issuing_authority: string | null
  document_number: string | null
  confidence: number
}

const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }
const primaryButton: React.CSSProperties = {
  padding: '0.6rem 1rem', background: 'var(--accent)', color: '#fff',
  border: '1px solid var(--accent)', borderRadius: 8, cursor: 'pointer', fontSize: '0.9rem',
}
const smallButton: React.CSSProperties = {
  padding: '0.35rem 0.7rem', fontSize: '0.82rem', borderRadius: 6, cursor: 'pointer',
  border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)',
}
const fieldStyle: React.CSSProperties = { width: '100%', padding: '0.6rem 0.75rem', fontSize: '0.92rem', marginTop: 4 }
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-soft)' }

// "org-id/1727470000000-driver license.pdf" → "driver license.pdf"
function fileNameFromUrl(url: string) {
  const raw = decodeURIComponent(url.split('/').pop() || 'document')
  return raw.replace(/^\d+-/, '')
}

// Older rows stored a full public URL; newer rows store just the storage path.
function storagePathFromUrl(url: string) {
  const marker = '/object/public/documents/'
  const i = url.indexOf(marker)
  return i === -1 ? url : decodeURIComponent(url.slice(i + marker.length))
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDay(d: string) {
  return new Date(d.slice(0, 10) + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

// A fingerprint of the file's contents, used to block exact duplicates
async function fileHash(file: File) {
  const buf = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// Pages that read the URL (?requirement=...) must be wrapped in <Suspense> for Vercel builds
export default function DocumentsPage() {
  return (
    <Suspense fallback={<p style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--ink-soft)' }}>Loading…</p>}>
      <DocumentsContent />
    </Suspense>
  )
}

function DocumentsContent() {
  const searchParams = useSearchParams()
  const preselectedRequirement = searchParams.get('requirement') || ''

  const [employees, setEmployees] = useState<Employee[]>([])
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [employeeId, setEmployeeId] = useState('')
  const [requirementId, setRequirementId] = useState(preselectedRequirement)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [analyzingDocId, setAnalyzingDocId] = useState<string | null>(null)
  const [reviewDoc, setReviewDoc] = useState<Document | null>(null)
  const [extracted, setExtracted] = useState<Extracted | null>(null)

  async function loadData() {
    const organizationId = await getCurrentOrganizationId()
    setOrgId(organizationId)
    if (!organizationId) {
      setLoading(false)
      return
    }
    const { data: emps } = await supabase.from('employees').select('id, name').eq('organization_id', organizationId).order('name')
    const { data: reqs } = await supabase.from('requirements').select('id, name').eq('organization_id', organizationId).order('name')
    const { data: docs } = await supabase.from('documents').select('*').eq('organization_id', organizationId).eq('archived', false).order('uploaded_at', { ascending: false })
    setEmployees(emps || [])
    setRequirements(reqs || [])
    setDocuments(docs || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  function resetForm() {
    setFile(null)
    setEmployeeId('')
    setRequirementId('')
    setUploading(false)
    const input = document.getElementById('file-input') as HTMLInputElement | null
    if (input) input.value = ''
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !orgId) return
    setUploading(true)

    // 1. Block exact duplicates before uploading anything
    const hash = await fileHash(file)
    const { data: existing } = await supabase
      .from('documents')
      .select('id')
      .eq('organization_id', orgId)
      .eq('file_hash', hash)
      .maybeSingle()
    if (existing) {
      alert('This exact file has already been uploaded.')
      setUploading(false)
      return
    }

    // 2. Each organization's files live in their own private folder
    const filePath = `${orgId}/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file)
    if (uploadError) {
      alert('Upload failed: ' + uploadError.message)
      setUploading(false)
      return
    }

    const { error } = await supabase.from('documents').insert({
      employee_id: employeeId || null,
      requirement_id: requirementId || null,
      file_url: filePath, // private storage path (not a public link)
      document_type: file.type,
      organization_id: orgId,
      file_hash: hash,
    })
    if (error) {
      await supabase.storage.from('documents').remove([filePath])
      alert(error.code === '23505' ? 'This exact file has already been uploaded.' : 'Saving the document failed: ' + error.message)
    }

    resetForm()
    loadData()
  }

  async function handleView(doc: Document) {
    // Open the tab right away (so pop-up blockers allow it), then load a 60-second private link
    const tab = window.open('', '_blank')
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(storagePathFromUrl(doc.file_url), 60)
    if (error || !data) {
      tab?.close()
      alert('Could not open this file. If it was uploaded before files were made private, delete it and upload it again.')
      return
    }
    if (tab) tab.location.href = data.signedUrl
    else window.location.href = data.signedUrl
  }

  async function handleAnalyze(doc: Document) {
    setAnalyzingDocId(doc.id)
    const res = await authedPost('/api/analyze-document', { documentId: doc.id })
    const result = await res.json()
    setAnalyzingDocId(null)

    if (result.error) {
      alert('Analysis failed: ' + result.error)
      return
    }

    setReviewDoc(doc)
    setExtracted(result)
  }

  async function handleConfirm() {
    if (!reviewDoc || !extracted) return

    // Save what was confirmed onto the document itself
    await supabase.from('documents').update({
      document_type: extracted.document_type || reviewDoc.document_type,
      expiration_date: extracted.expiration_date || null,
      status: 'approved',
    }).eq('id', reviewDoc.id)

    if (reviewDoc.requirement_id) {
      await supabase
        .from('documents')
        .update({ archived: true })
        .eq('requirement_id', reviewDoc.requirement_id)
        .neq('id', reviewDoc.id)

      if (extracted.expiration_date) {
        await supabase.from('requirements').update({
          expiration_date: extracted.expiration_date,
          status: 'active',
          last_reminder_date: null,
        }).eq('id', reviewDoc.requirement_id)
      }
    }

    setReviewDoc(null)
    setExtracted(null)
    loadData()
  }

  async function handleDelete(doc: Document) {
    const name = fileNameFromUrl(doc.file_url)
    if (!window.confirm(`Delete "${name}"? This can't be undone.`)) return

    setDeletingId(doc.id)
    // Remove the actual file from storage (if this fails, still remove the record)
    const { error: storageError } = await supabase.storage.from('documents').remove([storagePathFromUrl(doc.file_url)])
    if (storageError) console.warn('Could not remove file from storage:', storageError.message)

    const { error } = await supabase.from('documents').delete().eq('id', doc.id)
    if (error) { alert(`Couldn't delete document: ${error.message}`); setDeletingId(null); return }

    setDocuments(list => list.filter(d => d.id !== doc.id))
    setDeletingId(null)
  }

  function updateField(field: keyof Extracted, value: string) {
    if (!extracted) return
    setExtracted({ ...extracted, [field]: value })
  }

  const requirementName = (id: string | null) => requirements.find(r => r.id === id)?.name
  const employeeName = (id: string | null) => employees.find(e => e.id === id)?.name

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '2.5rem 1.75rem 4rem' }}>
      <h1 style={{ fontSize: '1.75rem', margin: '0 0 0.35rem' }}>Documents</h1>
      <p style={{ margin: '0 0 1.5rem', color: 'var(--ink-soft)', fontSize: '0.95rem' }}>
        Upload licenses and certificates. AI reads the expiration date for you.
      </p>

      {preselectedRequirement && (
        <div style={{ background: 'var(--signal-amber-bg)', color: 'var(--signal-amber)', border: '1px solid var(--line)', padding: '0.8rem 1rem', borderRadius: 10, marginBottom: '1rem', fontSize: '0.9rem' }}>
          Uploading a document for <strong>{requirementName(preselectedRequirement) || 'this requirement'}</strong>. It’s pre-selected below.
        </div>
      )}

      {/* Upload */}
      <form
        onSubmit={handleUpload}
        style={{ ...card, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, alignItems: 'end', padding: '1.25rem', marginBottom: '1.5rem' }}
      >
        <label style={labelStyle}>
          Employee <span style={{ fontWeight: 400 }}>(optional)</span>
          <select value={employeeId} onChange={e => setEmployeeId(e.target.value)} style={fieldStyle}>
            <option value="">None</option>
            {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
          </select>
        </label>
        <label style={labelStyle}>
          Requirement <span style={{ fontWeight: 400 }}>(optional)</span>
          <select value={requirementId} onChange={e => setRequirementId(e.target.value)} style={fieldStyle}>
            <option value="">None</option>
            {requirements.map(req => <option key={req.id} value={req.id}>{req.name}</option>)}
          </select>
        </label>
        <label style={labelStyle}>
          File (PDF or image)
          <input id="file-input" type="file" accept=".pdf,image/*" onChange={e => setFile(e.target.files?.[0] || null)} required style={{ ...fieldStyle, padding: '0.45rem' }} />
        </label>
        <button type="submit" disabled={uploading} style={{ ...primaryButton, opacity: uploading ? 0.7 : 1 }}>
          {uploading ? 'Uploading…' : 'Upload document'}
        </button>
      </form>

      {/* List */}
      {loading ? (
        <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>
      ) : documents.length === 0 ? (
        <div style={{ ...card, padding: '2.5rem', textAlign: 'center', color: 'var(--ink-soft)' }}>
          No documents uploaded yet.
        </div>
      ) : (
        <div style={{ ...card, overflow: 'hidden' }}>
          {documents.map((doc, i) => {
            const details = [
              requirementName(doc.requirement_id) && `For: ${requirementName(doc.requirement_id)}`,
              employeeName(doc.employee_id),
              doc.expiration_date && `Expires ${formatDay(doc.expiration_date)}`,
              `Uploaded ${formatDate(doc.uploaded_at)}`,
            ].filter(Boolean).join(' · ')
            const awaitingReview = doc.status === 'pending_review'
            return (
              <div
                key={doc.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap',
                  padding: '0.9rem 1.1rem', borderBottom: i === documents.length - 1 ? 'none' : '1px solid var(--line)',
                  opacity: deletingId === doc.id ? 0.4 : 1,
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {fileNameFromUrl(doc.file_url)}
                    {awaitingReview && (
                      <span style={{ marginLeft: 8, fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: 'var(--signal-green-bg)', color: 'var(--signal-green)' }}>
                        Awaiting review
                      </span>
                    )}
                  </div>
                  <div style={{ color: 'var(--ink-soft)', fontSize: '0.82rem', marginTop: 2 }}>{details}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => handleView(doc)} style={smallButton}>View</button>
                  <button
                    onClick={() => handleAnalyze(doc)}
                    disabled={analyzingDocId === doc.id}
                    style={{ ...smallButton, background: 'var(--accent)', color: '#fff', border: '1px solid var(--accent)' }}
                  >
                    {analyzingDocId === doc.id ? 'Analyzing…' : 'Analyze with AI'}
                  </button>
                  <button
                    onClick={() => handleDelete(doc)}
                    disabled={deletingId === doc.id}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--signal-red-bg)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                    style={{ ...smallButton, border: 'none', background: 'none', color: 'var(--signal-red)' }}
                  >
                    {deletingId === doc.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Review modal */}
      {reviewDoc && extracted && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,37,48,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div style={{ ...card, padding: '1.5rem', width: 400, maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 20px 50px rgba(28,37,48,0.25)' }}>
            <div>
              <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.15rem' }}>Review extracted info</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', margin: 0 }}>
                AI confidence: <strong>{Math.round((extracted.confidence || 0) * 100)}%</strong>. Check these before saving.
              </p>
            </div>

            <label style={labelStyle}>
              Document type
              <input value={extracted.document_type || ''} onChange={e => updateField('document_type', e.target.value)} style={fieldStyle} />
            </label>
            <label style={labelStyle}>
              Employee
              <input value={extracted.employee || ''} onChange={e => updateField('employee', e.target.value)} style={fieldStyle} />
            </label>
            <label style={labelStyle}>
              Expiration date
              <input type="date" value={extracted.expiration_date || ''} onChange={e => updateField('expiration_date', e.target.value)} style={fieldStyle} />
            </label>
            <label style={labelStyle}>
              Issuing authority
              <input value={extracted.issuing_authority || ''} onChange={e => updateField('issuing_authority', e.target.value)} style={fieldStyle} />
            </label>

            {reviewDoc.requirement_id && (
              <p style={{ fontSize: '0.82rem', color: 'var(--ink-soft)', margin: 0 }}>
                Saving will archive the old document for this requirement and update its expiration date.
              </p>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <button onClick={handleConfirm} style={{ ...primaryButton, flex: 1 }}>Confirm &amp; save</button>
              <button
                onClick={() => { setReviewDoc(null); setExtracted(null) }}
                style={{ ...primaryButton, flex: 1, background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--line)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}