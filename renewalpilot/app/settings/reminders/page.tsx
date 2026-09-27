'use client'

import { SettingsShell } from '../ui'

const SCHEDULE = [
  ['First reminder', 'Set per requirement (default 30 days before)'],
  ['Follow-ups', '7 days before, 1 day before, and the day it expires'],
  ['If overdue', 'Every 7 days until a new document is uploaded'],
  ['Who gets them', 'The responsible employee and your organization’s admins'],
  ['When', 'Every morning at 9 AM Central'],
]

export default function ReminderSettings() {
  return (
    <SettingsShell title="Email reminders" description="RenewalPilot emails your team automatically so nothing expires unnoticed.">
      <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem' }}>
        {SCHEDULE.map(([label, value]) => (
          <div
            key={label}
            style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.7rem 0.9rem', background: 'var(--paper)', borderRadius: 8 }}
          >
            <span style={{ color: 'var(--ink-soft)' }}>{label}</span>
            <span style={{ fontWeight: 500, textAlign: 'right' }}>{value}</span>
          </div>
        ))}
      </div>
      <p style={{ margin: '1.1rem 0 0', color: 'var(--ink-soft)', fontSize: '0.85rem', lineHeight: 1.5 }}>
        Reminders stop automatically once a new document with a later expiration date is uploaded.
      </p>
    </SettingsShell>
  )
}