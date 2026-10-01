'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getCurrentOrganizationId } from '@/lib/getOrganization'

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/attention', label: 'Attention' },
  { href: '/employees', label: 'Employees' },
  { href: '/requirements', label: 'Requirements' },
  { href: '/documents', label: 'Documents' },
]

const PLAN_NAMES: Record<string, string> = {
  free: 'Free plan',
  starter: 'Starter plan',
  business: 'Business plan',
  pro: 'Pro plan',
}

const menuItem: React.CSSProperties = {
  display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem 0.6rem',
  margin: '0 -0.6rem', borderRadius: 6, background: 'none', border: 'none',
  cursor: 'pointer', color: 'var(--ink)', fontSize: '0.88rem', fontFamily: 'inherit',
}

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const [email, setEmail] = useState('')
  const [orgName, setOrgName] = useState('')
  const [plan, setPlan] = useState('free')
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setEmail(user.email || '')

      const orgId = await getCurrentOrganizationId()
      if (!orgId) return
      const { data: org } = await supabase
        .from('organizations')
        .select('name, plan')
        .eq('id', orgId)
        .single()
      setOrgName(org?.name || 'My Organization')
      setPlan(org?.plan || 'free')
    }
    load()
  }, [pathname])

  // Close the dropdown when clicking anywhere outside it
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function go(path: string) {
    setOpen(false)
    router.push(path)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

      if (pathname === '/' || pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password' || pathname === '/reset-password' || pathname?.startsWith('/upload')) {
    return null
  }

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0.85rem 1.75rem', borderBottom: '1px solid var(--line)', background: 'var(--surface)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2.25rem' }}>
        <span style={{ fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>RenewalPilot</span>
        <nav style={{ display: 'flex', gap: '1.5rem' }}>
          {links.map(link => {
            const active = pathname?.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  fontSize: '0.88rem',
                  color: active ? 'var(--ink)' : 'var(--ink-soft)',
                  fontWeight: active ? 600 : 400,
                  textDecoration: 'none',
                  borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                  paddingBottom: 4,
                }}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>
      </div>

      <div ref={menuRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen(!open)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '0.35rem 0.75rem 0.35rem 0.35rem', borderRadius: 20,
            border: '1px solid var(--line)', background: 'var(--surface)', cursor: 'pointer',
          }}
        >
          <span style={{
            width: 26, height: 26, borderRadius: '50%', background: 'var(--accent)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 600,
          }}>
            {orgName.charAt(0).toUpperCase() || '?'}
          </span>
          <span style={{ fontSize: '0.88rem', color: 'var(--ink)' }}>{orgName}</span>
          <span style={{ fontSize: '0.65rem', color: 'var(--ink-soft)' }}>▾</span>
        </button>

        {open && (
          <div style={{
            position: 'absolute', right: 0, top: '110%', width: 240,
            background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10,
            boxShadow: '0 8px 24px rgba(28,37,48,0.12)', padding: '0.85rem', zIndex: 50,
          }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--ink-soft)', margin: '0 0 4px 0' }}>Signed in as</p>
            <p style={{ fontWeight: 600, margin: '0 0 0.5rem 0', fontSize: '0.88rem', wordBreak: 'break-all' }}>{email}</p>
            <span style={{
              display: 'inline-block', fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: 999,
              background: plan === 'free' ? 'var(--paper)' : 'var(--signal-green-bg)',
              color: plan === 'free' ? 'var(--ink-soft)' : 'var(--signal-green)',
              border: '1px solid var(--line)',
            }}>
              {PLAN_NAMES[plan] ?? 'Free plan'}
            </span>

            <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '0.75rem 0 0.4rem' }} />

            <button
              onClick={() => go('/settings')}
              style={menuItem}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--paper)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              Settings
            </button>

            <button
              onClick={() => go('/billing')}
              style={menuItem}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--paper)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              Billing
            </button>

            <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '0.4rem 0' }} />

            <button
              onClick={handleLogout}
              style={{ ...menuItem, color: 'var(--signal-red)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--signal-red-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              Log Out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}