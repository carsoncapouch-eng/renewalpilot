'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Member = { userId: string; name: string; email: string; isYou: boolean }
type Invite = { id: string; email: string; token: string; created_at: string }

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
  const source = name.trim() || email
  const parts = source.split(/[\s@.]+/).filter(Boolean)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?'
}

export default function TeamPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await teamCall({ action: 'list' })
      setMembers(data.members || [])
      setInvites(data.invites || [])
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
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800">
          ← Dashboard
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Team</h1>
        <p className="mt-1 text-gray-600">
          Invite coworkers so they can manage renewals with you. Everyone on the team sees the same
          employees, requirements and documents.
        </p>
      </div>

      {message && (
        <div
          className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
            message.type === 'ok'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Invite form */}
      <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Invite a teammate</h2>
        <p className="mt-1 text-sm text-gray-500">
          They&apos;ll get an email with a link to join. They must sign up or log in with this email.
        </p>
        <form onSubmit={sendInvite} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="coworker@company.com"
            className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {busy ? 'Sending…' : 'Send invite'}
          </button>
        </form>
      </section>

      {/* Members */}
      <section className="mb-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Members {!loading && <span className="text-gray-400">({members.length})</span>}
          </h2>
        </div>
        {loading ? (
          <p className="px-6 py-6 text-sm text-gray-500">Loading…</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {members.map((m) => (
              <li key={m.userId} className="flex items-center gap-4 px-6 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                  {initials(m.name, m.email)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900">
                    {m.name || m.email}
                    {m.isYou && (
                      <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        You
                      </span>
                    )}
                  </p>
                  {m.name && <p className="truncate text-sm text-gray-500">{m.email}</p>}
                </div>
                {!m.isYou && (
                  <button
                    onClick={() => removeMember(m)}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
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
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Pending invites <span className="text-gray-400">({invites.length})</span>
            </h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {invites.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center gap-3 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900">{inv.email}</p>
                  <p className="text-sm text-gray-500">
                    Invited {new Date(inv.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                  Pending
                </span>
                <button
                  onClick={() => copyLink(inv)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {copied === inv.id ? 'Copied!' : 'Copy link'}
                </button>
                <button
                  onClick={() => cancelInvite(inv)}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}