'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Employee = { id: string; name: string }
type Requirement = { id: string; name: string }
type Document = {
  id: string
  file_url: string
  document_type: string
  requirement_id: string | null
  archived: boolean
  uploaded_at: string
}
type Extracted = {
  document_type: string | null
  employee: string | null
  expiration_date: string | null
  issuing_authority: string | null
  document_number: string | null
  confidence: number
}

export default function DocumentsPage() {
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

  const [analyzingDocId, setAnalyzingDocId] = useState<string | null>(null)
  const [reviewDoc, setReviewDoc] = useState<Document | null>(null)
  const [extracted, setExtracted] = useState<Extracted | null>(null)

  async function loadData() {
    const { data: emps } = await supabase.from('employees').select('id, name').order('name')
    const { data: reqs } = await supabase.from('requirements').select('id, name').order('name')
    const { data: docs } = await supabase.from('documents').select('*').eq('archived', false).order('uploaded_at', { ascending: false })
    setEmployees(emps || [])
    setRequirements(reqs || [])
    setDocuments(docs || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setUploading(true)

    const filePath = `${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file)

    if (uploadError) {
      alert('Upload failed: ' + uploadError.message)
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath)

    await supabase.from('documents').insert({
      employee_id: employeeId || null,
      requirement_id: requirementId || null,
      file_url: urlData.publicUrl,
      document_type: file.type,
    })

    setFile(null)
    setEmployeeId('')
    setRequirementId('')
    setUploading(false)
    loadData()
  }

  async function handleAnalyze(doc: Document) {
    setAnalyzingDocId(doc.id)
    const res = await fetch('/api/analyze-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileUrl: doc.file_url }),
    })
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

    await supabase.from('documents').update({
      document_type: extracted.document_type || reviewDoc.document_type,
    }).eq('id', reviewDoc.id)

    if (reviewDoc.requirement_id) {
      // Archive any other documents previously linked to this requirement
      await supabase
        .from('documents')
        .update({ archived: true })
        .eq('requirement_id', reviewDoc.requirement_id)
        .neq('id', reviewDoc.id)

      // Update the requirement with the new expiration date and reset status
      if (extracted.expiration_date) {
        await supabase.from('requirements').update({
          expiration_date: extracted.expiration_date,
          status: 'active',
        }).eq('id', reviewDoc.requirement_id)
      }
    }

    setReviewDoc(null)
    setExtracted(null)
    loadData()
  }

  function updateField(field: keyof Extracted, value: string) {
    if (!extracted) return
    setExtracted({ ...extracted, [field]: value })
  }

  return (
    <div style={{ maxWidth: 700, margin: '3rem auto', padding: '0 1rem' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>Documents</h1>

      {preselectedRequirement && (
        <p style={{ background: '#fef3c7', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem' }}>
          Uploading a renewal for a specific requirement — it's pre-selected below.
        </p>
      )}

      <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '2rem', padding: '1rem', border: '1px solid #eee', borderRadius: 8 }}>
        <label>
          Employee (optional)
          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} style={{ width: '100%', padding: '0.5rem', marginTop: 4 }}>
            <option value="">None</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        </label>
        <label>
          Requirement (optional)
          <select value={requirementId} onChange={(e) => setRequirementId(e.target.value)} style={{ width: '100%', padding: '0.5rem', marginTop: 4 }}>
            <option value="">None</option>
            {requirements.map((req) => (
              <option key={req.id} value={req.id}>{req.name}</option>
            ))}
          </select>
        </label>
        <input type="file" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
        <button type="submit" disabled={uploading} style={{ padding: '0.6rem', background: '#000', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
          {uploading ? 'Uploading...' : 'Upload Document'}
        </button>
      </form>

      {loading ? (
        <p>Loading...</p>
      ) : documents.length === 0 ? (
        <p>No documents uploaded yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {documents.map((doc) => (
            <li key={doc.id} style={{ padding: '0.75rem 0', borderBottom: '1px solid #f0f0f0' }}>
              <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                {doc.file_url.split('/').pop()}
              </a>
              <span style={{ color: '#888', marginLeft: 8, fontSize: '0.85rem' }}>({doc.document_type})</span>
              <button
                onClick={() => handleAnalyze(doc)}
                disabled={analyzingDocId === doc.id}
                style={{ marginLeft: 12, padding: '0.25rem 0.6rem', fontSize: '0.8rem', cursor: 'pointer' }}
              >
                {analyzingDocId === doc.id ? 'Analyzing...' : 'Analyze with AI'}
              </button>
            </li>
          ))}
        </ul>
      )}

      {reviewDoc && extracted && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 12, width: 340, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h2 style={{ marginBottom: 4 }}>Review Extracted Info</h2>
            <p style={{ fontSize: '0.85rem', color: '#888', marginTop: 0 }}>
              Confidence: {Math.round((extracted.confidence || 0) * 100)}% — check these before saving.
            </p>

            <label>
              Document Type
              <input value={extracted.document_type || ''} onChange={(e) => updateField('document_type', e.target.value)} style={{ width: '100%', padding: '0.5rem', marginTop: 4 }} />
            </label>
            <label>
              Employee
              <input value={extracted.employee || ''} onChange={(e) => updateField('employee', e.target.value)} style={{ width: '100%', padding: '0.5rem', marginTop: 4 }} />
            </label>
            <label>
              Expiration Date
              <input type="date" value={extracted.expiration_date || ''} onChange={(e) => updateField('expiration_date', e.target.value)} style={{ width: '100%', padding: '0.5rem', marginTop: 4 }} />
            </label>
            <label>
              Issuing Authority
              <input value={extracted.issuing_authority || ''} onChange={(e) => updateField('issuing_authority', e.target.value)} style={{ width: '100%', padding: '0.5rem', marginTop: 4 }} />
            </label>

            {reviewDoc.requirement_id && (
              <p style={{ fontSize: '0.8rem', color: '#888' }}>
                Confirming will archive the old document for this requirement and update its expiration date.
              </p>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button onClick={handleConfirm} style={{ flex: 1, padding: '0.6rem', background: '#000', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                Confirm & Save
              </button>
              <button onClick={() => { setReviewDoc(null); setExtracted(null) }} style={{ flex: 1, padding: '0.6rem', border: '1px solid #000', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}