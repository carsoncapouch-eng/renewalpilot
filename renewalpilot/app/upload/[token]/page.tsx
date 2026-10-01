'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Info = { requirement: string; employee: string | null; organization: string | null; expiration_date: string | null }

function pretty(d: string | null) {
  if (!d) return null
  return new Date(d.slice(0, 10) + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

// A fingerprint of the file's contents, used to block exact duplicates
async function fileHash(file: File) {
  const buf = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

const shell: React.CSSProperties = {
  minHeight: '100vh', background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
}
const cardStyle: React.CSSProperties = {
  width: '100%', maxWidth: 440, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16,
  boxShadow: '0 20px 50px rgba(28,37,48,0.10)', overflow: 'hidden',
}

export default function EmployeeUploadPage() {
  const { token } = useParams<{ token: string }>()
  const [info, setInfo] = useState<Info | null>(null)
  const [state, setState] = useState<'loading' | 'invalid' | 'ready' | 'uploading' | 'done'>('loading')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [foundDate, setFoundDate] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/upload/${token}`)
      .then(async res => {
        if (!res.ok) { setState('invalid'); return }
        setInfo(await res.json())
        setState('ready')
      })
      .catch(() => setState('invalid'))
  }, [token])

  async function post(body: object) {
    const res = await fetch(`/api/upload/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Something went wrong.')
    return json
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setError('')
    setState('uploading')
    try {
      const contentType = file.type || 'application/octet-stream'
      const hash = await fileHash(file)
      // 1. Get a one-time upload slot (also checks for duplicates)
      const { path, uploadToken } = await post({ action: 'start', fileName: file.name, contentType, size: file.size, fileHash: hash })
      // 2. Upload the file straight to private storage
      const { error: uploadError } = await supabase.storage.from('documents').uploadToSignedUrl(path, uploadToken, file, { contentType })
      if (uploadError) throw new Error('Upload failed. Please try again.')
      // 3. Save it and let AI read it
      const result = await post({ action: 'complete', path, contentType, fileHash: hash })
      setFoundDate(result.expiration_date)
      setState('done')
    } catch (err) {
      setError((err as Error).message)
      setState('ready')
    }
  }

  const header = (
    <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontWeight: 700, letterSpacing: '-0.01em' }}>RenewalPilot</span>
      {info?.organization && <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>{info.organization}</span>}
    </div>
  )

  if (state === 'loading') {
    return <div style={shell}><p style={{ color: 'var(--ink-soft)' }}>Loading…</p></div>
  }

  if (state === 'invalid') {
    return (
      <div style={shell}>
        <div style={cardStyle}>
          {header}
          <div style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.3rem', margin: '0 0 0.5rem' }}>This link isn’t working</h1>
            <p style={{ color: 'var(--ink-soft)', margin: 0, lineHeight: 1.5 }}>
              It may have already been used or replaced by a newer one. Ask your manager for a new link.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (state === 'done') {
    return (
      <div style={shell}>
        <div style={cardStyle}>
          {header}
          <div style={{ padding: '2.25rem 1.5rem', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--signal-green-bg)', color: 'var(--signal-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', margin: '0 auto 1rem' }}>✓</div>
            <h1 style={{ fontSize: '1.35rem', margin: '0 0 0.5rem' }}>
              Thanks{info?.employee ? `, ${info.employee.split(' ')[0]}` : ''}!
            </h1>
            <p style={{ color: 'var(--ink-soft)', margin: '0 0 1rem', lineHeight: 1.5 }}>
              We received your new <strong style={{ color: 'var(--ink)' }}>{info?.requirement}</strong>. Your manager will review it shortly.
            </p>
            {foundDate && (
              <p style={{ display: 'inline-block', background: 'var(--paper)', borderRadius: 8, padding: '0.6rem 0.9rem', margin: 0, fontSize: '0.9rem' }}>
                New expiration date: <strong>{pretty(foundDate)}</strong>
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ready / uploading
  return (
    <div style={shell}>
      <div style={cardStyle}>
        {header}
        <form onSubmit={handleSubmit} style={{ padding: '1.75rem 1.5rem' }}>
          <p style={{ margin: '0 0 0.35rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Renewal needed
          </p>
          <h1 style={{ fontSize: '1.45rem', margin: '0 0 0.4rem', lineHeight: 1.25 }}>Upload your new {info?.requirement}</h1>
          <p style={{ color: 'var(--ink-soft)', margin: '0 0 1.5rem', fontSize: '0.92rem', lineHeight: 1.5 }}>
            {info?.employee ? `For ${info.employee}. ` : ''}
            {info?.expiration_date ? `The current one expires ${pretty(info.expiration_date)}.` : ''}
          </p>

          <label
            htmlFor="upload-file"
            style={{
              display: 'block', border: '2px dashed var(--line)', borderRadius: 12, padding: '1.75rem 1rem', textAlign: 'center',
              cursor: 'pointer', background: file ? 'var(--signal-green-bg)' : 'var(--paper)', marginBottom: '1rem',
            }}
          >
            <div style={{ fontSize: '1.6rem', marginBottom: 6 }}>{file ? '📄' : '📷'}</div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
              {file ? file.name : 'Tap to take a photo or choose a file'}
            </div>
            <div style={{ color: 'var(--ink-soft)', fontSize: '0.8rem', marginTop: 4 }}>
              {file ? 'Tap to choose a different file' : 'PDF, JPG or PNG · up to 10 MB'}
            </div>
          </label>
          <input
            id="upload-file"
            type="file"
            accept="image/*,.pdf"
            onChange={e => { setFile(e.target.files?.[0] || null); setError('') }}
            style={{ display: 'none' }}
          />

          {error && (
            <p style={{ color: 'var(--signal-red)', background: 'var(--signal-red-bg)', padding: '0.6rem 0.8rem', borderRadius: 8, fontSize: '0.88rem', margin: '0 0 1rem' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!file || state === 'uploading'}
            style={{
              width: '100%', padding: '0.9rem', borderRadius: 10, border: 'none', fontSize: '1rem', fontWeight: 600,
              background: 'var(--accent)', color: '#fff', cursor: !file || state === 'uploading' ? 'default' : 'pointer',
              opacity: !file ? 0.5 : 1,
            }}
          >
            {state === 'uploading' ? 'Uploading & reading…' : 'Submit document'}
          </button>
          <p style={{ textAlign: 'center', color: 'var(--ink-soft)', fontSize: '0.78rem', margin: '1rem 0 0' }}>
            🔒 Your document is stored privately and only shared with your employer.
          </p>
        </form>
      </div>
    </div>
  )
}