'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 6 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '0.75rem 0.85rem', fontSize: '0.95rem', outline: 'none' }

export default function ResetPasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState<'checking' | 'yes' | 'no'>('checking')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // The email link signs the user in temporarily so they can set a new password
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN')) setReady('yes')
    })
    const timer = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setReady(r => (r === 'yes' ? 'yes' : session ? 'yes' : 'no'))
    }, 1500)
    return () => { listener.subscription.unsubscribe(); clearTimeout(timer) }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Please use at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords don’t match.'); return }
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setBusy(false); return }
    router.push('/dashboard')
  }

  const card: React.CSSProperties = {
    width: '100%', maxWidth: 400, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16,
    padding: '2rem', boxShadow: '0 20px 50px rgba(28,37,48,0.08)',
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--paper)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.25rem' }}>
      <Link href="/" style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--ink)', textDecoration: 'none', letterSpacing: '-0.01em', marginBottom: '1.5rem' }}>
        RenewalPilot
      </Link>

      {ready === 'checking' && <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>}

      {ready === 'no' && (
        <div style={{ ...card, textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.3rem', margin: '0 0 0.5rem' }}>This link has expired</h1>
          <p style={{ color: 'var(--ink-soft)', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
            Reset links only work once and for a limited time. Request a new one below.
          </p>
          <Link href="/forgot-password" style={{ color: 'var(--accent)', fontWeight: 600 }}>Send a new reset link</Link>
        </div>
      )}

      {ready === 'yes' && (
        <form onSubmit={handleSubmit} style={card}>
          <h1 style={{ fontSize: '1.5rem', margin: '0 0 0.35rem' }}>Choose a new password</h1>
          <p style={{ color: 'var(--ink-soft)', margin: '0 0 1.5rem', fontSize: '0.92rem' }}>Use at least 8 characters.</p>

          <label style={labelStyle}>New password</label>
          <input style={inputStyle} type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} required />
          <div style={{ height: '1rem' }} />
          <label style={labelStyle}>Confirm new password</label>
          <input style={inputStyle} type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} required />

          {error && (
            <p style={{ color: 'var(--signal-red)', background: 'var(--signal-red-bg)', padding: '0.65rem 0.8rem', borderRadius: 8, fontSize: '0.88rem', margin: '1rem 0 0' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            style={{ width: '100%', marginTop: '1.5rem', padding: '0.85rem', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: '1rem', fontWeight: 600, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.7 : 1 }}
          >
            {busy ? 'Saving…' : 'Save new password'}
          </button>
        </form>
      )}
    </main>
  )
}