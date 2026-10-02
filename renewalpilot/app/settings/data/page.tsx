'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getCurrentOrganizationId } from '@/lib/getOrganization'
import '@/app/rp.css'

async function authHeaders() {
  const { data } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${data.session?.access_token || ''}`,
  }
}

export default function DataPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [orgName, setOrgName] = useState('')
  const [isOwner, setIsOwner] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        router.push('/login')
        return
      }
      try {
        const orgId = await getCurrentOrganizationId()
        if (orgId) {
          const { data: org } = await supabase
            .from('organizations')
            .select('name')
            .eq('id', orgId)
            .single()
          setOrgName(org?.name || '')
        }
        const res = await fetch('/api/team', {
          method: 'POST',
          headers: await authHeaders(),
          body: JSON.stringify({ action: 'list' }),
        })
        const json = await res.json().catch(() => ({}))
        setIsOwner(!!json.isOwner)
      } catch {
        setMessage({ type: 'error', text: 'Could not load your company. Please refresh.' })
      } finally {
        setLoading(false)
      }
    })()
  }, [router])

  async function download(type: 'requirements' | 'employees') {
    setDownloading(type)
    setMessage(null)
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ type }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Download failed.')
      }
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') || ''
      const match = disposition.match(/filename="([^"]+)"/)
      const filename = match ? match[1] : `renewalpilot-${type}.csv`

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message })
    } finally {
      setDownloading(null)
    }
  }

  const nameMatches =
    orgName.trim().length > 0 && confirmText.trim().toLowerCase() === orgName.trim().toLowerCase()

  async function deleteCompany() {
    if (!nameMatches) return
    if (!confirm(`Last check: permanently delete ${orgName} and everything in it?`)) return
    setDeleting(true)
    setMessage(null)
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ confirm: confirmText }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Something went wrong.')
      await supabase.auth.signOut()
      window.location.href = '/'
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message })
      setDeleting(false)
    }
  }

  return (
    <main className="rp-page">
      <Link href="/dashboard" className="rp-back">
        ← Dashboard
      </Link>
      <h1 className="rp-title">Export &amp; delete</h1>
      <p className="rp-sub">Download a copy of your data, or permanently delete your company.</p>

      {message && <div className={`rp-alert ${message.type}`}>{message.text}</div>}

      {/* Export */}
      <section className="rp-card rp-card-pad">
        <h2 className="rp-h2">Export your data</h2>
        <p className="rp-muted">
          Download a spreadsheet (CSV) you can open in Excel or Google Sheets.
        </p>
        <div className="rp-form">
          <button
            className="rp-btn"
            disabled={downloading !== null}
            onClick={() => download('requirements')}
          >
            {downloading === 'requirements' ? 'Preparing…' : 'Download requirements (CSV)'}
          </button>
          <button
            className="rp-btn"
            disabled={downloading !== null}
            onClick={() => download('employees')}
            style={{ background: '#fff', color: '#1f2937', border: '1px solid #d1d5db' }}
          >
            {downloading === 'employees' ? 'Preparing…' : 'Download employees (CSV)'}
          </button>
        </div>
      </section>

      {/* Delete */}
      {!loading && (
        <section className="rp-card rp-card-pad" style={{ borderColor: '#fecaca' }}>
          <h2 className="rp-h2" style={{ color: '#b91c1c' }}>
            Delete company
          </h2>

          {isOwner ? (
            <>
              <p className="rp-muted">This permanently deletes:</p>
              <ul className="rp-muted" style={{ paddingLeft: 20, margin: '8px 0 0' }}>
                <li>All employees, requirements and documents</li>
                <li>All uploaded files</li>
                <li>Everyone&apos;s login on this team, including yours</li>
                <li>Your subscription (it is canceled right away, with no refund for unused time)</li>
              </ul>
              <p className="rp-muted" style={{ marginTop: 12 }}>
                <strong>This can&apos;t be undone.</strong> Download your data first if you might need it.
              </p>

              <label className="rp-label" style={{ marginTop: 20 }}>
                Type <strong>{orgName}</strong> to confirm
              </label>
              <div className="rp-form" style={{ marginTop: 0 }}>
                <input
                  className="rp-input"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={orgName}
                />
                <button
                  className="rp-btn"
                  disabled={!nameMatches || deleting}
                  onClick={deleteCompany}
                  style={{ background: '#dc2626' }}
                >
                  {deleting ? 'Deleting…' : 'Permanently delete'}
                </button>
              </div>
            </>
          ) : (
            <p className="rp-muted">Only the owner of this company can delete it.</p>
          )}
        </section>
      )}
    </main>
  )
}