'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 6 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '0.75rem 0.85rem', fontSize: '0.95rem', outline: 'none' }

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message === 'Invalid login credentials' ? 'That email and password don’t match. Please try again.' : error.message)
      setBusy(false)
    } else {
      router.push('/dashboard')
    }
  }

  async function handleGoogle() {
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
    if (error) setError(error.message)
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--paper)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.25rem' }}>
      <Link href="/" style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--ink)', textDecoration: 'none', letterSpacing: '-0.01em', marginBottom: '1.5rem' }}>
        RenewalPilot
      </Link>

      <form
        onSubmit={handleLogin}
        style={{ width: '100%', maxWidth: 400, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: '2rem', boxShadow: '0 20px 50px rgba(28,37,48,0.08)' }}
      >
        <h1 style={{ fontSize: '1.5rem', margin: '0 0 0.35rem' }}>Welcome back</h1>
        <p style={{ color: 'var(--ink-soft)', margin: '0 0 1.5rem', fontSize: '0.92rem' }}>Log in to manage your renewals.</p>

        <button
          type="button"
          onClick={handleGoogle}
          style={{ width: '100%', padding: '0.8rem', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer' }}
        >
          Continue with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '1.25rem 0', color: 'var(--ink-soft)', fontSize: '0.8rem' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          or
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        </div>

        <label style={labelStyle}>Email</label>
        <input style={inputStyle} type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required />
        <div style={{ height: '1rem' }} />
        <label style={labelStyle}>Password</label>        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <label style={labelStyle}>Password</label>
          <Link href="/forgot-password" style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>Forgot password?</Link>
        </div>
        <input style={inputStyle} type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required />

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
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem', marginTop: '1.25rem' }}>
        New to RenewalPilot?{' '}
        <Link href="/signup" style={{ color: 'var(--accent)', fontWeight: 600 }}>Create an account</Link>
      </p>
    </main>
  )
}