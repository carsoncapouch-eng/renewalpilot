'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getCurrentOrganizationId } from '@/lib/getOrganization'

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

  async function logOut() {
    setOpen(false)
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (hidden || !loggedIn) return null

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link href="/dashboard" className="shrink-0 text-lg font-bold text-blue-600">
          RenewalPilot
        </Link>

        <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            <span className="max-w-[160px] truncate">{orgName || 'My organization'}</span>
            <svg
              className={`h-4 w-4 text-gray-500 transition ${open ? 'rotate-180' : ''}`}
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
            <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
              <div className="border-b border-gray-100 px-4 py-2">
                <p className="text-xs text-gray-500">Organization</p>
                <p className="truncate text-sm font-semibold text-gray-900">
                  {orgName || 'My organization'}
                </p>
              </div>
              <button
                onClick={() => {
                  setOpen(false)
                  router.push('/settings')
                }}
                className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                Settings
              </button>
              <button
                onClick={() => {
                  setOpen(false)
                  router.push('/team')
                }}
                className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                Team
              </button>
              <button
                onClick={() => {
                  setOpen(false)
                  router.push('/billing')
                }}
                className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                Billing
              </button>
              <div className="my-1 border-t border-gray-100" />
              <button
                onClick={logOut}
                className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}