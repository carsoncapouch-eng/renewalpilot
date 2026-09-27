'use client'

import { useRouter } from 'next/navigation'

export type Notice = { type: 'success' | 'error'; text: string } | null

export const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-soft)', margin: '0 0 0.4rem',
}

export const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.65rem 0.8rem', fontSize: '0.92rem', outline: 'none',
}

export function Spacer() {
  return <div style={{ height: '1.1rem' }} />
}

// Page wrapper: back link, title, description, white card
export function SettingsShell(props: { title: string; description: string; children: React.ReactNode }) {
  const router = useRouter()
  return (
    <main style={{ maxWidth: 680, margin: '0 auto', padding: '2.5rem 1.75rem 4rem' }}>
      <button
        onClick={() => router.push('/settings')}
        style={{ background: 'none', border: 'none', padding: 0, color: 'var(--ink-soft)', fontSize: '0.85rem', cursor: 'pointer', marginBottom: '1rem' }}
      >
        ← Settings
      </button>
      <h1 style={{ fontSize: '1.6rem', margin: '0 0 0.35rem' }}>{props.title}</h1>
      <p style={{ color: 'var(--ink-soft)', margin: '0 0 1.5rem', fontSize: '0.95rem' }}>{props.description}</p>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '1.5rem' }}>
        {props.children}
      </div>
    </main>
  )
}

// Save button + "Saved ✓" / error message
export function SaveRow(props: { label: string; busyLabel: string; busy: boolean; onClick: () => void; notice: Notice }) {
  return (
    <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <button
        onClick={props.onClick}
        disabled={props.busy}
        style={{
          padding: '0.6rem 1.1rem', borderRadius: 8, border: '1px solid var(--accent)',
          background: 'var(--accent)', color: '#fff', fontSize: '0.9rem',
          cursor: props.busy ? 'wait' : 'pointer', opacity: props.busy ? 0.7 : 1,
        }}
      >
        {props.busy ? props.busyLabel : props.label}
      </button>
      {props.notice && (
        <span style={{ fontSize: '0.85rem', color: props.notice.type === 'success' ? 'var(--signal-green)' : 'var(--signal-red)' }}>
          {props.notice.text}
        </span>
      )}
    </div>
  )
}