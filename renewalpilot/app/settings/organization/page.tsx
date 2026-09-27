'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getCurrentOrganizationId } from '@/lib/getOrganization'
import { SettingsShell, SaveRow, Spacer, labelStyle, inputStyle, type Notice } from '../ui'

export default function OrganizationSettings() {
  const [orgId, setOrgId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [industry, setIndustry] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)

  useEffect(() => {
    async function load() {
      const id = await getCurrentOrganizationId()
      setOrgId(id)
      if (!id) return
      const { data } = await supabase.from('organizations').select('name, industry').eq('id', id).single()
      setName(data?.name || '')
      setIndustry(data?.industry || '')
    }
    load()
  }, [])

  async function save() {
    if (!orgId) return
    if (!name.trim()) { setNotice({ type: 'error', text: 'Organization name can’t be empty.' }); return }
    setBusy(true); setNotice(null)
    const { error } = await supabase
      .from('organizations')
      .update({ name: name.trim(), industry: industry.trim() || null })
      .eq('id', orgId)
    setBusy(false)
    setNotice(error ? { type: 'error', text: error.message } : { type: 'success', text: 'Saved ✓' })
  }

  return (
    <SettingsShell title="Organization" description="Shown in the header and on reminder emails.">
      <label style={labelStyle}>Organization name</label>
      <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Acme Construction" />
      <Spacer />
      <label style={labelStyle}>Industry <span style={{ fontWeight: 400 }}>(optional)</span></label>
      <input style={inputStyle} value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. Construction, Healthcare, Trucking" />
      <SaveRow label="Save changes" busyLabel="Saving…" busy={busy} onClick={save} notice={notice} />
    </SettingsShell>
  )
}