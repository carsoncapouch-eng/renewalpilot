'use client'
import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

const inputStyle: React.CSSProperties = { width: '100%', padding: '0.75rem 0.85rem', fontSize: '0.95rem', outline: 'none' }

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setBusy(false)
    // Show the same message whether or not the account exists (so nobody can check which emails have accounts)
    if (error && !/not found|invalid/i.test(error.message)) setError(error.message)
    else setSent(true)
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

      {sent ? (
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--signal-green-bg)', color: 'var(--signal-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', margin: '0 auto 1rem' }}>✉</div>
          <h1 style={{ fontSize: '1.4rem', margin: '0 0 0.5rem' }}>Check your email</h1>
          <p style={{ color: 'var(--ink-soft)', margin: 0, lineHeight: 1.5 }}>
            If an account exists for <strong style={{ color: 'var(--ink)' }}>{email}</strong>, we sent a link to reset your password.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={card}>
          <h1 style={{ fontSize: '1.5rem', margin: '0 0 0.35rem' }}>Reset your password</h1>
          <p style={{ color: 'var(--ink-soft)', margin: '0 0 1.5rem', fontSize: '0.92rem' }}>
            Enter your email and we’ll send you a link to choose a new password.
          </p>

          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 6 }}>Email</label>
          <input style={inputStyle} type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required />

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
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}

      <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem', marginTop: '1.25rem' }}>
        Remembered it?{' '}
        <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Back to log in</Link>
      </p>
    </main>
  )
}