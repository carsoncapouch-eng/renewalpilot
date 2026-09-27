'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { SettingsShell, SaveRow, Spacer, labelStyle, inputStyle, type Notice } from '../ui'

export default function PasswordSettings() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)

  async function save() {
    if (password.length < 8) { setNotice({ type: 'error', text: 'Use at least 8 characters.' }); return }
    if (password !== confirm) { setNotice({ type: 'error', text: 'Passwords don’t match.' }); return }
    setBusy(true); setNotice(null)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) {
      setNotice({ type: 'error', text: error.message })
    } else {
      setPassword(''); setConfirm('')
      setNotice({ type: 'success', text: 'Password updated ✓' })
    }
  }

  return (
    <SettingsShell title="Password" description="Choose a new password with at least 8 characters.">
      <label style={labelStyle}>New password</label>
      <input type="password" style={inputStyle} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
      <Spacer />
      <label style={labelStyle}>Confirm new password</label>
      <input type="password" style={inputStyle} value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" />
      <SaveRow label="Update password" busyLabel="Updating…" busy={busy} onClick={save} notice={notice} />
    </SettingsShell>
  )
}