'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getCurrentOrganizationId } from '@/lib/getOrganization'

const PLAN_NAMES: Record<string, string> = {
  free: 'Free plan', starter: 'Starter plan', business: 'Business plan', pro: 'Pro plan',
}

export default function SettingsMenu() {
  const router = useRouter()
  const [orgName, setOrgName] = useState('')
  const [email, setEmail] = useState('')
  const [plan, setPlan] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      setEmail(user?.email || '')
      const orgId = await getCurrentOrganizationId()
      if (!orgId) return
      const { data: org } = await supabase.from('organizations').select('name, plan').eq('id', orgId).single()
      setOrgName(org?.name || '')
      setPlan(org?.plan || 'free')
    }
    load()
  }, [])

  const items = [
    { href: '/settings/organization', title: 'Organization',    subtitle: orgName || 'Company name and industry' },
    { href: '/settings/profile',      title: 'Your profile',    subtitle: email || 'Your name and email' },
    { href: '/settings/password',     title: 'Password',        subtitle: 'Change your password' },
    { href: '/settings/reminders',    title: 'Email reminders', subtitle: 'When reminder emails go out' },
    { href: '/billing',               title: 'Billing',         subtitle: plan ? PLAN_NAMES[plan] ?? 'Free plan' : 'Plan, payment method and invoices' },
  ]

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '2.5rem 1.75rem 4rem' }}>
      <h1 style={{ fontSize: '1.75rem', margin: '0 0 0.35rem' }}>Settings</h1>
      <p style={{ color: 'var(--ink-soft)', margin: '0 0 1.75rem', fontSize: '0.95rem' }}>
        Manage your organization, profile and account.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        {items.map(item => (
          <button
            key={item.href}
            onClick={() => router.push(item.href)}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--line)')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
              width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--ink)',
              background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '1.25rem 1.4rem',
              transition: 'border-color 0.15s',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: 4 }}>{item.title}</div>
              <div style={{ color: 'var(--ink-soft)', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.subtitle}
              </div>
            </div>
            <span style={{ color: 'var(--ink-soft)', fontSize: '1.1rem' }}>→</span>
          </button>
        ))}
      </div>
    </main>
  )
}