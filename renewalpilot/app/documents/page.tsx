'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Employee = { id: string; name: string }
type Requirement = { id: string; name: string }
type Document = {
  id: string
  file_url: string
  document_type: string
  uploaded_at: string
}

export default function DocumentsPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [employeeId, setEmployeeId] = useState('')
  const [requirementId, setRequirementId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)

  async function loadData() {
    const { data: emps } = await supabase.from('employees').select('id, name').order('name')
    const { data: reqs } = await supabase.from('requirements').select('id, name').order('name')
    const { data: docs } = await supabase.from('documents').select('*').order('uploaded_at', { ascending: false })
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

  async function handleAnalyze(fileUrl: string) {
    const res = await fetch('/api/analyze-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileUrl }),
    })
    const result = await res.json()
    alert(JSON.stringify(result, null, 2))
  }

  return (
    <div style={{ maxWidth: 700, margin: '3rem auto', padding: '0 1rem' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>Documents</h1>

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
                onClick={() => handleAnalyze(doc.file_url)}
                style={{ marginLeft: 12, padding: '0.25rem 0.6rem', fontSize: '0.8rem', cursor: 'pointer' }}
              >
                Analyze with AI
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}