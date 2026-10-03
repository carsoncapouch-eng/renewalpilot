'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

const STEPS = [
  { n: '1', title: 'Upload', text: 'Add a license, certificate, insurance policy or permit, as a PDF or a phone photo.' },
  { n: '2', title: 'AI reads the date', text: 'RenewalPilot finds the expiration date for you. You confirm it with one click.' },
  { n: '3', title: 'Automatic reminders', text: 'Your employee gets emailed before it expires, with a private link to upload the renewal from their phone.' },
  { n: '4', title: 'Approve and repeat', text: 'You approve the new document and the next cycle starts on its own. Overdue items alert your team.' },
]

const FEATURES = [
  { title: 'AI reads your documents', text: 'No more typing dates from paperwork. Upload it and confirm what the AI found.' },
  { title: 'No logins for employees', text: 'Every reminder has a private upload link. Employees just tap, snap a photo and submit.' },
  { title: 'Reminders that follow up', text: 'Emails go out before the deadline and keep going weekly until it’s renewed.' },
  { title: 'Overdue alerts for managers', text: 'If something slips, your whole team gets an alert so nothing falls through the cracks.' },
  { title: 'Everything in one place', text: 'See what’s overdue, expiring soon and ready to approve at a glance. Export to a spreadsheet anytime.' },
  { title: 'Private and secure', text: 'Files are stored privately and each company’s data is locked to that company only.' },
]

const INDUSTRIES = [
  'Contractors & trades',
  'Home care & healthcare',
  'Security companies',
  'Trucking & fleets',
  'Restaurants',
  'Staffing agencies',
  'Cleaning & facilities',
  'Any team with expiring credentials',
]

const PLANS = [
  { name: 'Starter', price: 49, yearly: 490, limit: 'Up to 10 active employees', text: 'For small teams getting their renewals under control.', popular: false },
  { name: 'Business', price: 99, yearly: 990, limit: 'Up to 50 active employees', text: 'For growing teams with more people to keep compliant.', popular: true },
  { name: 'Pro', price: 199, yearly: 1990, limit: 'Unlimited employees', text: 'For larger companies that need room to grow.', popular: false },
]

const FAQS = [
  {
    q: 'Do my employees need to create an account?',
    a: 'No. Each reminder email includes a private upload link. Employees tap it, take a photo of their new certificate and submit. No password needed.',
  },
  {
    q: 'What can I track?',
    a: 'Anything with an expiration date: professional licenses, certifications (CPR, OSHA, forklift, CDL medical cards), insurance policies and certificates of insurance, business licenses, permits, training and inspections.',
  },
  {
    q: 'How does the AI work?',
    a: 'When you upload a document, AI reads the expiration date and other details. You always review and confirm before anything is saved, so you stay in control.',
  },
  {
    q: 'Can you set it up for me?',
    a: 'Yes. During your free trial, just email us photos or PDFs of your team’s documents and we’ll set everything up for you, free.',
  },
  {
    q: 'What happens when my free trial ends?',
    a: 'Your data stays safe. Your account becomes read-only and reminders pause until you choose a plan. No credit card is needed to start.',
  },
  {
    q: 'Is my data secure?',
    a: 'Documents are stored privately, connections are encrypted, and each company can only see its own data. We never sell your information.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Cancel from the Billing page in one click. You keep access until the end of the period you paid for.',
  },
]

const PREVIEW = [
  { name: 'Forklift License', who: 'Jordan Kim', when: 'Renewal uploaded · ready to approve', color: 'var(--signal-green)', bg: 'var(--signal-green-bg)', label: 'Review' },
  { name: 'CPR Certification', who: 'Taylor Brooks', when: 'Expires in 6 days', color: 'var(--signal-amber)', bg: 'var(--signal-amber-bg)', label: 'Expiring soon' },
  { name: 'Liability Insurance', who: 'Company', when: 'Expired 3 days ago', color: 'var(--signal-red)', bg: 'var(--signal-red-bg)', label: 'Overdue' },
]

const container: React.CSSProperties = { maxWidth: 1100, margin: '0 auto', padding: '0 1.5rem' }
const primaryCta: React.CSSProperties = {
  display: 'inline-block', padding: '0.85rem 1.4rem', background: 'var(--accent)', color: '#fff',
  borderRadius: 10, textDecoration: 'none', fontWeight: 600, fontSize: '0.98rem',
}
const secondaryCta: React.CSSProperties = {
  display: 'inline-block', padding: '0.85rem 1.4rem', background: 'var(--surface)', color: 'var(--ink)',
  border: '1px solid var(--line)', borderRadius: 10, textDecoration: 'none', fontWeight: 600, fontSize: '0.98rem',
}
const sectionTitle: React.CSSProperties = {
  fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', margin: '0 0 0.6rem', textAlign: 'center', letterSpacing: '-0.02em',
}
const sectionSub: React.CSSProperties = {
  color: 'var(--ink-soft)', textAlign: 'center', maxWidth: 560, margin: '0 auto 2.5rem', fontSize: '1.02rem', lineHeight: 1.6,
}

export default function HomePage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  // Remember where the visitor came from (e.g. ?utm_source=capterra), first visit wins
  useEffect(() => {
    try {
      if (localStorage.getItem('rp_signup_source')) return
      const params = new URLSearchParams(window.location.search)
      const utm = params.get('utm_source') || params.get('ref')
      const referrer = document.referrer && !document.referrer.includes(window.location.host) ? document.referrer : ''
      const source = utm ? `utm:${utm}` : referrer ? `ref:${referrer}` : ''
      if (source) localStorage.setItem('rp_signup_source', source.slice(0, 200))
    } catch {}
  }, [])

  // Logged-in users skip the homepage and go straight to their dashboard
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/dashboard')
      else setChecking(false)
    })
  }, [router])

  if (checking) return <div style={{ minHeight: '100vh', background: 'var(--paper)' }} />

  return (
    <div style={{ background: 'var(--paper)', minHeight: '100vh' }}>
      {/* Nav */}
      <nav style={{ ...container, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem' }}>
        <span style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>RenewalPilot</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <Link href="#pricing" style={{ color: 'var(--ink)', textDecoration: 'none', fontSize: '0.92rem' }}>Pricing</Link>
          <Link href="/login" style={{ color: 'var(--ink)', textDecoration: 'none', fontSize: '0.92rem' }}>Log in</Link>
          <Link href="/signup" style={{ ...primaryCta, padding: '0.55rem 1rem', fontSize: '0.9rem' }}>Start free trial</Link>
        </div>
      </nav>

      {/* Hero */}
      <header style={{ ...container, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem', alignItems: 'center', padding: '4rem 1.5rem 3.5rem' }}>
        <div>
          <span style={{ display: 'inline-block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent)', background: 'var(--surface)', border: '1px solid var(--line)', padding: '4px 12px', borderRadius: 999, marginBottom: '1.25rem' }}>
            Renewals that manage themselves
          </span>
          <h1 style={{ fontSize: 'clamp(2.1rem, 5.5vw, 3.3rem)', lineHeight: 1.08, margin: '0 0 1.25rem', letterSpacing: '-0.03em' }}>
            Never miss an employee license, certification or insurance renewal again.
          </h1>
          <p style={{ fontSize: '1.1rem', lineHeight: 1.6, color: 'var(--ink-soft)', margin: '0 0 1.75rem', maxWidth: 500 }}>
            Upload a document and AI reads the expiration date. RenewalPilot reminds your employee, collects the new one
            from their phone, and resets the clock. You just click approve.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link href="/signup" style={primaryCta}>Start your free trial</Link>
            <Link href="#how" style={secondaryCta}>See how it works</Link>
          </div>
          <p style={{ margin: '1.1rem 0 0', fontSize: '0.88rem', color: 'var(--ink-soft)' }}>
            ✓ 14-day free trial &nbsp; ✓ No credit card &nbsp; ✓ Or we’ll set it up for you
          </p>
        </div>

        {/* Product preview */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, boxShadow: '0 24px 60px rgba(28,37,48,0.12)', overflow: 'hidden' }}>
          <div style={{ padding: '0.9rem 1.2rem', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>Needs attention</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>Updated today</span>
          </div>
          {PREVIEW.map((r, i) => (
            <div key={r.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '1rem 1.2rem', borderBottom: i === PREVIEW.length - 1 ? 'none' : '1px solid var(--line)', borderLeft: `4px solid ${r.color}` }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{r.name}</div>
                <div style={{ color: 'var(--ink-soft)', fontSize: '0.8rem', marginTop: 2 }}>{r.who} · {r.when}</div>
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '3px 10px', borderRadius: 999, color: r.color, background: r.bg, whiteSpace: 'nowrap' }}>{r.label}</span>
            </div>
          ))}
          <div style={{ padding: '0.9rem 1.2rem', background: 'var(--paper)', fontSize: '0.8rem', color: 'var(--ink-soft)' }}>
            ✉ Reminder sent to Taylor Brooks this morning
          </div>
        </div>
      </header>

      {/* Built for */}
      <section style={{ ...container, padding: '0 1.5rem 4rem' }}>
        <p style={{ textAlign: 'center', fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 1rem' }}>
          Built for small teams in
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.5rem' }}>
          {INDUSTRIES.map(i => (
            <span key={i} style={{ fontSize: '0.85rem', padding: '6px 12px', borderRadius: 999, background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
              {i}
            </span>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" style={{ background: 'var(--surface)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', padding: '5rem 0' }}>
        <div style={container}>
          <h2 style={sectionTitle}>How it works</h2>
          <p style={sectionSub}>From paperwork to automatic renewals in four steps.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
            {STEPS.map(s => (
              <div key={s.n} style={{ padding: '1.5rem', border: '1px solid var(--line)', borderRadius: 14, background: 'var(--paper)' }}>
                <div className="mono" style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, marginBottom: '1rem' }}>{s.n}</div>
                <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.05rem' }}>{s.title}</h3>
                <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: '0.92rem', lineHeight: 1.55 }}>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '5rem 0' }}>
        <div style={container}>
          <h2 style={sectionTitle}>Better than a spreadsheet</h2>
          <p style={sectionSub}>A spreadsheet stores dates. RenewalPilot actually gets renewals done.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{ padding: '1.4rem 1.5rem', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14 }}>
                <h3 style={{ margin: '0 0 0.4rem', fontSize: '1rem' }}>
                  <span style={{ color: 'var(--signal-green)', marginRight: 8 }}>✓</span>{f.title}
                </h3>
                <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: '0.92rem', lineHeight: 1.55 }}>{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ background: 'var(--surface)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', padding: '5rem 0' }}>
        <div style={container}>
          <h2 style={sectionTitle}>Simple pricing</h2>
          <p style={sectionSub}>One flat price per company. Every feature on every plan. 14-day free trial, no credit card. Pay yearly and get 2 months free.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', maxWidth: 960, margin: '0 auto' }}>
            {PLANS.map(p => (
              <div key={p.name} style={{ position: 'relative', padding: '1.75rem', borderRadius: 14, background: 'var(--paper)', border: p.popular ? '2px solid var(--accent)' : '1px solid var(--line)', display: 'flex', flexDirection: 'column' }}>
                {p.popular && (
                  <span style={{ position: 'absolute', top: -11, left: '1.5rem', fontSize: '0.7rem', fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: 'var(--accent)', color: '#fff', letterSpacing: '0.03em' }}>
                    MOST POPULAR
                  </span>
                )}
                <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.1rem' }}>{p.name}</h3>
                <p style={{ margin: 0 }}>
                  <span className="mono" style={{ fontSize: '2.4rem', fontWeight: 600, letterSpacing: '-0.02em' }}>${p.price}</span>
                  <span style={{ color: 'var(--ink-soft)' }}> / month</span>
                </p>
                <p style={{ margin: '0.3rem 0 0', fontSize: '0.82rem', color: 'var(--ink-soft)' }}>or ${p.yearly.toLocaleString()} / year (2 months free)</p>
                <p style={{ margin: '0.9rem 0 0', fontWeight: 600, fontSize: '0.95rem' }}>{p.limit}</p>
                <p style={{ color: 'var(--ink-soft)', fontSize: '0.92rem', lineHeight: 1.55, margin: '0.4rem 0 1.5rem', flex: 1 }}>{p.text}</p>
                <Link href="/signup" style={{ ...(p.popular ? primaryCta : secondaryCta), textAlign: 'center' }}>Start free trial</Link>
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', color: 'var(--ink-soft)', fontSize: '0.85rem', marginTop: '1.75rem', lineHeight: 1.6 }}>
            Every plan includes AI document reading, automatic reminders, employee upload links, overdue alerts, team access and CSV export.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: '5rem 0' }}>
        <div style={{ ...container, maxWidth: 760 }}>
          <h2 style={sectionTitle}>Questions</h2>
          <p style={sectionSub}>Everything you need to know before you start.</p>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {FAQS.map(f => (
              <details key={f.q} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '1rem 1.25rem' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.98rem' }}>{f.q}</summary>
                <p style={{ margin: '0.75rem 0 0', color: 'var(--ink-soft)', fontSize: '0.93rem', lineHeight: 1.6 }}>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ padding: '1rem 0 5rem', textAlign: 'center' }}>
        <div style={container}>
          <h2 style={{ ...sectionTitle, marginBottom: '1rem' }}>Never miss a renewal again.</h2>
          <p style={{ ...sectionSub, marginBottom: '2rem' }}>Set up your team in minutes, or send us your documents and we’ll do it for you.</p>
          <Link href="/signup" style={primaryCta}>Start your free trial</Link>
        </div>
      </section>
    </div>
  )
}