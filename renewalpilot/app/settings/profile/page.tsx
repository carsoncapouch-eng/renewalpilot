'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { SettingsShell, SaveRow, Spacer, labelStyle, inputStyle, type Notice } from '../ui'

export default function ProfileSettings() {
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [fullName, setFullName] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      setEmail(user.email || '')
      const { data: profile } = await supabase.from('profiles').select('name, role').eq('user_id', user.id).single()
      setFullName(profile?.name && profile.name !== user.email ? profile.name : '')
      setRole(profile?.role || '')
    }
    load()
  }, [])

  async function save() {
    if (!userId) return
    setBusy(true); setNotice(null)
    const { error } = await supabase.from('profiles').update({ name: fullName.trim() || email }).eq('user_id', userId)
    setBusy(false)
    setNotice(error ? { type: 'error', text: error.message } : { type: 'success', text: 'Saved ✓' })
  }

  return (
    <SettingsShell title="Your profile" description="How you appear to your team.">
      <label style={labelStyle}>Full name</label>
      <input style={inputStyle} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Carson Capouch" />
      <Spacer />
      <label style={labelStyle}>Email</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <span style={{ fontSize: '0.92rem' }}>{email}</span>
        {role && (
          <span style={{
            fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: 999, textTransform: 'capitalize',
            background: 'var(--paper)', color: 'var(--ink-soft)', border: '1px solid var(--line)',
          }}>
            {role}
          </span>
        )}
      </div>
      <SaveRow label="Save changes" busyLabel="Saving…" busy={busy} onClick={save} notice={notice} />
    </SettingsShell>
  )
}