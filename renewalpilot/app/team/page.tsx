'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import '@/app/rp.css'

type Member = {
  userId: string
  name: string
  email: string
  role: 'owner' | 'member'
  isYou: boolean
}
type Invite = { id: string; email: string; token: string; created_at: string }

const ESCALATION_CHOICES = [
  { value: 1, label: '1 day overdue' },
  { value: 3, label: '3 days overdue (recommended)' },
  { value: 7, label: '7 days overdue' },
  { value: 14, label: '14 days overdue' },
  { value: 0, label: 'Off — never email the team' },
]

async function teamCall(body: Record<string, unknown>) {
  const { data } = await supabase.auth.getSession()
  const res = await fetch('/api/team', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session?.access_token || ''}`,
    },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Something went wrong.')
  return json
}

function initials(name: string, email: string) {
  const source = name.trim() && !name.includes('@') ? name : email.split('@')[0]
  const parts = source.split(/[\s._-]+/).filter(Boolean)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?'
}

export default function TeamPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [isOwner, setIsOwner] = useState(false)
  const [escalationDays, setEscalationDays] = useState(3)
  const [savingEsc, setSavingEsc] = useState(false)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await teamCall({ action: 'list' })
      setMembers(data.members || [])
      setInvites(data.invites || [])
      setIsOwner(!!data.isOwner)
      setEscalationDays(typeof data.escalationDays === 'number' ? data.escalationDays : 3)
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.push('/login')
      else load()
    })
  }, [load, router])

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setBusy(true)
    setMessage(null)
    try {
      const data = await teamCall({ action: 'invite', email })
      setMessage({
        type: 'ok',
        text: data.emailSent
          ? `Invite sent to ${email.trim().toLowerCase()}.`
          : `Invite created, but the email didn't send. Use "Copy link" to share it.`,
      })
      setEmail('')
      await load()
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message })
    } finally {
      setBusy(false)
    }
  }

  async function changeEscalation(days: number) {
    setSavingEsc(true)
    setMessage(null)
    try {
      await teamCall({ action: 'setEscalation', days })
      setEscalationDays(days)
      setMessage({
        type: 'ok',
        text:
          days === 0
            ? 'Overdue alerts are off.'
            : `Saved. The team will be emailed when something is ${days} day${days === 1 ? '' : 's'} overdue.`,
      })
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message })
    } finally {
      setSavingEsc(false)
    }
  }

  async function cancelInvite(invite: Invite) {
    if (!confirm(`Cancel the invite for ${invite.email}?`)) return
    setMessage(null)
    try {
      await teamCall({ action: 'cancel', inviteId: invite.id })
      await load()
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message })
    }
  }

  async function removeMember(member: Member) {
    const who = member.name || member.email
    if (!confirm(`Remove ${who} from your team? They will lose access right away.`)) return
    setMessage(null)
    try {
      await teamCall({ action: 'remove', userId: member.userId })
      setMessage({ type: 'ok', text: `${who} was removed.` })
      await load()
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message })
    }
  }

  async function copyLink(invite: Invite) {
    const link = `${window.location.origin}/join/${invite.token}`
    try {
      await navigator.clipboard.writeText(link)
      setCopied(invite.id)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      prompt('Copy this invite link:', link)
    }
  }

  return (
    <main className="rp-page">
      <Link href="/dashboard" className="rp-back">
        ← Dashboard
      </Link>
      <h1 className="rp-title">Team</h1>
      <p className="rp-sub">
        Invite coworkers so they can manage renewals with you. Everyone on the team sees the same
        employees, requirements and documents.
      </p>

      {message && <div className={`rp-alert ${message.type}`}>{message.text}</div>}

      {/* Invite form */}
      <section className="rp-card rp-card-pad">
        <h2 className="rp-h2">Invite a teammate</h2>
        <p className="rp-muted">
          They&apos;ll get an email with a link to join. They must sign up or log in with this email.
        </p>
        <form onSubmit={sendInvite} className="rp-form">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="coworker@company.com"
            className="rp-input"
          />
          <button type="submit" disabled={busy} className="rp-btn">
            {busy ? 'Sending…' : 'Send invite'}
          </button>
        </form>
      </section>

      {/* Members */}
      <section className="rp-card">
        <div className="rp-card-head">
          <h2 className="rp-h2">
            Members {!loading && <span className="rp-count">({members.length})</span>}
          </h2>
        </div>
        {loading ? (
          <p className="rp-muted" style={{ padding: '20px 24px', margin: 0 }}>
            Loading…
          </p>
        ) : (
          <ul className="rp-list">
            {members.map((m) => (
              <li key={m.userId} className="rp-row">
                <div className="rp-avatar">{initials(m.name, m.email)}</div>
                <div className="rp-grow">
                  <p className="rp-name">
                    {m.name && !m.name.includes('@') ? m.name : m.email}
                    {m.role === 'owner' && <span className="rp-badge blue">Owner</span>}
                    {m.isYou && <span className="rp-badge">You</span>}
                  </p>
                  {m.name && !m.name.includes('@') && <p className="rp-muted">{m.email}</p>}
                </div>
                {isOwner && !m.isYou && m.role !== 'owner' && (
                  <button onClick={() => removeMember(m)} className="rp-btn-danger">
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Pending invites */}
      {!loading && invites.length > 0 && (
        <section className="rp-card">
          <div className="rp-card-head">
            <h2 className="rp-h2">
              Pending invites <span className="rp-count">({invites.length})</span>
            </h2>
          </div>
          <ul className="rp-list">
            {invites.map((inv) => (
              <li key={inv.id} className="rp-row">
                <div className="rp-grow">
                  <p className="rp-name">{inv.email}</p>
                  <p className="rp-muted">Invited {new Date(inv.created_at).toLocaleDateString()}</p>
                </div>
                <span className="rp-badge amber">Pending</span>
                <button onClick={() => copyLink(inv)} className="rp-btn-outline">
                  {copied === inv.id ? 'Copied!' : 'Copy link'}
                </button>
                {isOwner && (
                  <button onClick={() => cancelInvite(inv)} className="rp-btn-danger">
                    Cancel
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Overdue alerts */}
      {!loading && (
        <section className="rp-card rp-card-pad">
          <h2 className="rp-h2">Overdue alerts</h2>
          <p className="rp-muted">
            If a renewal stays overdue, everyone on this team gets an email listing it. The alert
            repeats once a week until it&apos;s renewed.
          </p>
          <div className="rp-form">
            <select
              className="rp-input"
              value={escalationDays}
              disabled={!isOwner || savingEsc}
              onChange={(e) => changeEscalation(Number(e.target.value))}
            >
              {ESCALATION_CHOICES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.value === 0 ? c.label : `Email the team when ${c.label}`}
                </option>
              ))}
            </select>
          </div>
          {!isOwner && <p className="rp-muted">Only the owner can change this.</p>}
        </section>
      )}
    </main>
  )
}