'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import '@/app/rp.css'

type Info = { orgName: string; email: string; accepted: boolean }

export default function JoinPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()

  const [status, setStatus] = useState<'loading' | 'notfound' | 'ready' | 'checkEmail'>('loading')
  const [info, setInfo] = useState<Info | null>(null)
  const [sessionEmail, setSessionEmail] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    ;(async () => {
      const res = await fetch(`/api/join/${token}`)
      if (!res.ok) {
        setStatus('notfound')
        return
      }
      const data: Info = await res.json()
      setInfo(data)
      const { data: s } = await supabase.auth.getSession()
      setSessionEmail(s.session?.user.email?.toLowerCase() || null)
      setStatus('ready')
    })()
  }, [token])

  async function continueWithGoogle() {
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
    if (error) setError(error.message)
  }

  async function createAccount(e: React.FormEvent) {
    e.preventDefault()
    if (!info) return
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setBusy(true)
    setError('')
    const { data, error } = await supabase.auth.signUp({
      email: info.email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { name },
      },
    })
    setBusy(false)

    if (error) {
      setError(
        error.message.toLowerCase().includes('registered')
          ? 'You already have an account with this email. Log in instead.'
          : error.message
      )
      return
    }
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setError('You already have an account with this email. Log in instead.')
      return
    }
    if (data.session) router.push('/dashboard')
    else setStatus('checkEmail')
  }

  async function logOut() {
    await supabase.auth.signOut()
    setSessionEmail(null)
  }

  return (
    <main className="rp-center">
      <div className="rp-auth">
        <Link href="/" className="rp-auth-logo">
          RenewalPilot
        </Link>

        <div className="rp-card rp-auth-card">
          {status === 'loading' && <p className="rp-auth-text rp-text-center">Loading invite…</p>}

          {status === 'notfound' && (
            <div className="rp-text-center">
              <h1 className="rp-auth-title">Invite not found</h1>
              <p className="rp-auth-text">
                This invite link isn&apos;t valid anymore. Ask your teammate to send a new one.
              </p>
              <p style={{ marginTop: 24 }}>
                <Link href="/login" className="rp-link">
                  Go to log in
                </Link>
              </p>
            </div>
          )}

          {status === 'checkEmail' && info && (
            <div className="rp-text-center">
              <h1 className="rp-auth-title">Check your email</h1>
              <p className="rp-auth-text">
                We sent a confirmation link to <strong>{info.email}</strong>. Click it and you&apos;ll
                join <strong>{info.orgName}</strong> automatically.
              </p>
            </div>
          )}

          {status === 'ready' && info && info.accepted && (
            <div className="rp-text-center">
              <h1 className="rp-auth-title">Invite already accepted</h1>
              <p className="rp-auth-text">
                You&apos;re already on <strong>{info.orgName}</strong>. Just log in.
              </p>
              <Link href="/login" className="rp-btn full" style={{ marginTop: 24 }}>
                Log in
              </Link>
            </div>
          )}

          {status === 'ready' && info && !info.accepted && sessionEmail && (
            <div className="rp-text-center">
              <h1 className="rp-auth-title">Join {info.orgName}</h1>
              {sessionEmail === info.email.toLowerCase() ? (
                <>
                  <p className="rp-auth-text">You&apos;re logged in with the invited email.</p>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="rp-btn full"
                    style={{ marginTop: 24 }}
                  >
                    Join team
                  </button>
                </>
              ) : (
                <>
                  <p className="rp-auth-text">
                    You&apos;re logged in as <strong>{sessionEmail}</strong>, but this invite is for{' '}
                    <strong>{info.email}</strong>.
                  </p>
                  <button onClick={logOut} className="rp-btn full" style={{ marginTop: 24 }}>
                    Log out and continue
                  </button>
                </>
              )}
            </div>
          )}

          {status === 'ready' && info && !info.accepted && !sessionEmail && (
            <>
              <div className="rp-text-center">
                <h1 className="rp-auth-title">Join {info.orgName}</h1>
                <p className="rp-auth-text">
                  You were invited as <strong>{info.email}</strong>
                </p>
              </div>

              <button onClick={continueWithGoogle} className="rp-google">
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                  <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                  <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
                </svg>
                Continue with Google
              </button>

              <div className="rp-divider">or create a password</div>

              <form onSubmit={createAccount}>
                <div className="rp-field">
                  <label className="rp-label">Email</label>
                  <input value={info.email} readOnly className="rp-input" />
                </div>
                <div className="rp-field">
                  <label className="rp-label">Your name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Smith"
                    className="rp-input"
                  />
                </div>
                <div className="rp-field">
                  <label className="rp-label">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="rp-input"
                  />
                </div>
                <button type="submit" disabled={busy} className="rp-btn full">
                  {busy ? 'Creating account…' : 'Create account and join'}
                </button>
              </form>

              <p className="rp-auth-text rp-text-center" style={{ marginTop: 24, fontSize: 14 }}>
                Already have an account?{' '}
                <Link href="/login" className="rp-link">
                  Log in
                </Link>
              </p>
            </>
          )}

          {error && <p className="rp-error">{error}</p>}
        </div>
      </div>
    </main>
  )
}