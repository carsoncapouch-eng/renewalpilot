'use client'
import { useEffect, useState } from 'react'
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

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const [email, setEmail] = useState('')
  const [orgName, setOrgName] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setEmail(user.email || '')

      const orgId = await getCurrentOrganizationId()
      if (!orgId) return
      const { data: org } = await supabase.from('organizations').select('name').eq('id', orgId).single()
      setOrgName(org?.name || 'My Organization')
    }
    load()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (pathname === '/' || pathname === '/login' || pathname === '/signup') {
    return null
  }

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0.75rem 1.5rem', borderBottom: '1px solid #eee', background: '#fff',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <span style={{ fontWeight: 700 }}>RenewalPilot</span>
        <nav style={{ display: 'flex', gap: '1.25rem' }}>
          {links.map(link => {
            const active = pathname?.startsWith(link.href)
            return (
 <a
                key={link.href}
                href={link.href}
                style={{
                  fontSize: '0.9rem',
                  color: active ? '#000' : '#888',
                  fontWeight: active ? 600 : 400,
                  textDecoration: 'none',
                  borderBottom: active ? '2px solid #000' : '2px solid transparent',
                  paddingBottom: 4,
                }}
              >
                {link.label}
              </a>
            )
          })}
        </nav>
      </div>

      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen(!open)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '0.4rem 0.75rem', borderRadius: 8,
            border: '1px solid #ddd', background: '#fff', cursor: 'pointer',
          }}
        >
          <span style={{
            width: 26, height: 26, borderRadius: '50%', background: '#000', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem',
          }}>
            {orgName.charAt(0).toUpperCase() || '?'}
          </span>
          <span style={{ fontSize: '0.9rem' }}>{orgName}</span>
        </button>

        {open && (
          <div style={{
            position: 'absolute', right: 0, top: '110%', width: 220,
            background: '#fff', border: '1px solid #ddd', borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '0.75rem', zIndex: 50,
          }}>
            <p style={{ fontSize: '0.75rem', color: '#888', margin: '0 0 4px 0' }}>Signed in as</p>
            <p style={{ fontWeight: 600, margin: '0 0 0.75rem 0', fontSize: '0.9rem' }}>{email}</p>
            <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '0.5rem 0' }} />
            <button
              onClick={handleLogout}
              style={{ width: '100%', textAlign: 'left', padding: '0.5rem 0', background: 'none', border: 'none', cursor: 'pointer', color: '#b23b3b', fontSize: '0.9rem' }}
            >
              Log Out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}