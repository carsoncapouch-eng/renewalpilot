'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 6 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '0.75rem 0.85rem', fontSize: '0.95rem', outline: 'none' }

export default function SignupPage() {
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)
  const router = useRouter()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Please use a password with at least 8 characters.'); return }
    setBusy(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { company_name: company.trim() }, // used to name their organization
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    })

    if (error) {
      setError(error.message)
      setBusy(false)
      return
    }

    // If Supabase requires email confirmation, there's no session yet
    if (!data.session) {
      setCheckEmail(true)
      setBusy(false)
      return
    }

    router.push('/dashboard')
  }

  async function handleGoogle() {
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
    if (error) setError(error.message)
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

      {checkEmail ? (
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--signal-green-bg)', color: 'var(--signal-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', margin: '0 auto 1rem' }}>✉</div>
          <h1 style={{ fontSize: '1.4rem', margin: '0 0 0.5rem' }}>Check your email</h1>
          <p style={{ color: 'var(--ink-soft)', margin: 0, lineHeight: 1.5 }}>
            We sent a confirmation link to <strong style={{ color: 'var(--ink)' }}>{email}</strong>. Click it to finish setting up your account.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSignup} style={card}>
          <h1 style={{ fontSize: '1.5rem', margin: '0 0 0.35rem' }}>Create your account</h1>
          <p style={{ color: 'var(--ink-soft)', margin: '0 0 1.5rem', fontSize: '0.92rem' }}>Start tracking renewals in minutes.</p>

          <button
            type="button"
            onClick={handleGoogle}
            style={{ width: '100%', padding: '0.8rem', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer' }}
          >
            Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '1.25rem 0', color: 'var(--ink-soft)', fontSize: '0.8rem' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            or sign up with email
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          </div>

          <label style={labelStyle}>Company name</label>
          <input style={inputStyle} value={company} onChange={e => setCompany(e.target.value)} placeholder="Acme Construction" autoComplete="organization" required />
          <div style={{ height: '1rem' }} />
          <label style={labelStyle}>Work email</label>
          <input style={inputStyle} type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required />
          <div style={{ height: '1rem' }} />
          <label style={labelStyle}>Password</label>
          <input style={inputStyle} type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" required />

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
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      )}

      <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem', marginTop: '1.25rem' }}>
        Already have an account?{' '}
        <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Log in</Link>
      </p>
    </main>
  )
}