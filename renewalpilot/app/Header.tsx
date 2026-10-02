'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getCurrentOrganizationId } from '@/lib/getOrganization'
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

export default function Header() {
  const pathname = usePathname() || '/'
  const router = useRouter()
  const [orgName, setOrgName] = useState('')
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
        const { data: org } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', orgId)
          .single()
        if (!cancelled) setOrgName(org?.name || 'My organization')
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
    </header>
  )
}