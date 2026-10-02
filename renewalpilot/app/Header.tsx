'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getCurrentOrganizationId } from '@/lib/getOrganization'
import { accessState, trialDaysLeft, AccessInfo } from '@/lib/access'
import '@/app/rp.css'

const HIDDEN_EXACT = ['/', '/login', '/signup', '/forgot-password', '/reset-password']
const HIDDEN_PREFIX = ['/upload', '/join']

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/attention', label: 'Attention' },
  { href: '/requirements', label: 'Requirements' },
  { href: '/employees', label: 'Employees' },
  { href: '/documents', label: 'Documents' },
]

type Banner = { text: string; link: string; color: string; bg: string; border: string }

function bannerFor(org: AccessInfo | null): Banner | null {
  if (!org) return null
  const state = accessState(org)

  if (state === 'paid') {
    if (org.subscription_status === 'past_due') {
      return {
        text: "Your last payment didn't go through. Update your card to keep reminders running.",
        link: 'Fix billing →',
        color: '#92400e',
        bg: '#fffbeb',
        border: '#fde68a',
      }
    }
    return null
  }

  if (state === 'trial') {
    const days = trialDaysLeft(org)
    const urgent = days <= 3
    return {
      text: `Free trial · ${days} day${days === 1 ? '' : 's'} left. Everything is unlocked.`,
      link: 'Choose a plan →',
      color: urgent ? '#92400e' : '#1e40af',
      bg: urgent ? '#fffbeb' : '#eff6ff',
      border: urgent ? '#fde68a' : '#dbeafe',
    }
  }

  return {
    text: 'Your free trial has ended. Your account is read-only and reminder emails are paused.',
    link: 'Choose a plan →',
    color: '#b91c1c',
    bg: '#fef2f2',
    border: '#fecaca',
  }
}

export default function Header() {
  const pathname = usePathname() || '/'
  const router = useRouter()
  const [orgName, setOrgName] = useState('')
  const [org, setOrg] = useState<AccessInfo | null>(null)
  const [loggedIn, setLoggedIn] = useState(false)
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const hidden =
    HIDDEN_EXACT.includes(pathname) || HIDDEN_PREFIX.some((p) => pathname.startsWith(p))

  useEffect(() => {
    setOpen(false)
    if (hidden) return
    let cancelled = false

    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        if (!cancelled) setLoggedIn(false)
        return
      }
      if (!cancelled) setLoggedIn(true)
      try {
        const orgId = await getCurrentOrganizationId()
        if (!orgId) return
        const { data: row } = await supabase
          .from('organizations')
          .select('name, plan, subscription_status, trial_ends_at')
          .eq('id', orgId)
          .single()
        if (!cancelled) {
          setOrgName(row?.name || 'My organization')
          setOrg(row || null)
        }
      } catch {
        if (!cancelled) setOrgName('My organization')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [pathname, hidden])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function go(href: string) {
    setOpen(false)
    router.push(href)
  }

  async function logOut() {
    setOpen(false)
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (hidden || !loggedIn) return null

  const banner = bannerFor(org)

  return (
    <header className="rp-header">
      <div className="rp-header-inner">
        <Link href="/dashboard" className="rp-logo">
          RenewalPilot
        </Link>

        <nav className="rp-nav">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link key={item.href} href={item.href} className={active ? 'active' : ''}>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="rp-menu" ref={menuRef}>
          <button className="rp-menu-btn" onClick={() => setOpen((o) => !o)}>
            <span>{orgName || 'My organization'}</span>
            <svg
              className={`rp-chevron ${open ? 'open' : ''}`}
              width="16"
              height="16"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {open && (
            <div className="rp-dropdown">
              <div className="rp-dropdown-head">
                <small>Organization</small>
                <strong>{orgName || 'My organization'}</strong>
              </div>
              <button onClick={() => go('/settings')}>Settings</button>
              <button onClick={() => go('/team')}>Team</button>
              <button onClick={() => go('/billing')}>Billing</button>
              <button onClick={() => go('/settings/data')}>Export &amp; delete</button>
              <hr />
              <button className="danger" onClick={logOut}>
                Log out
              </button>
            </div>
          )}
        </div>
      </div>

      {banner && (
        <div
          style={{
            background: banner.bg,
            color: banner.color,
            borderTop: `1px solid ${banner.border}`,
            fontSize: 14,
          }}
        >
          <div
            style={{
              maxWidth: 1100,
              margin: '0 auto',
              padding: '8px 16px',
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
            }}
          >
            <span>{banner.text}</span>
            {pathname !== '/billing' && (
              <Link href="/billing" style={{ fontWeight: 600, color: banner.color, whiteSpace: 'nowrap' }}>
                {banner.link}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}