'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

const STEPS = [
  { n: '1', title: 'Upload', text: 'Drop in a license, certificate, insurance policy or permit, as a PDF or a photo.' },
  { n: '2', title: 'AI reads it', text: 'RenewalPilot pulls out the expiration date, issuer and holder. You confirm with one click.' },
  { n: '3', title: 'Automatic reminders', text: 'The right person gets emailed 30, 7 and 1 day before, with a link to upload the renewal from their phone.' },
  { n: '4', title: 'Renewed', text: 'They upload the new document, you approve it, and the next cycle starts on its own.' },
]

const FEATURES = [
  { title: 'AI document reading', text: 'No more typing dates from paperwork. Upload it and review what AI found.' },
  { title: 'Employees upload from their phone', text: 'Every reminder has a private link. No account or password needed.' },
  { title: 'Reminders that follow up', text: 'Emails keep going every week until the renewal is done, not just once.' },
  { title: 'Know what needs attention', text: 'See what’s overdue, what’s expiring soon, and what’s ready to approve at a glance.' },
  { title: 'Private and secure', text: 'Each company’s data and files are locked to that company only.' },
  { title: 'Set up in minutes', text: 'Add your team, add requirements, and you’re done. No training needed.' },
]

const PLANS = [
  { name: 'Starter', price: 49, text: 'For small teams getting their renewals under control.', popular: false },
  { name: 'Business', price: 99, text: 'More employees, workflows, assignments and reporting.', popular: true },
  { name: 'Pro', price: 199, text: 'Larger teams with advanced automation and integrations.', popular: false },
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
          <Link href="/login" style={{ color: 'var(--ink)', textDecoration: 'none', fontSize: '0.92rem' }}>Log in</Link>
          <Link href="/signup" style={{ ...primaryCta, padding: '0.55rem 1rem', fontSize: '0.9rem' }}>Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <header style={{ ...container, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem', alignItems: 'center', padding: '4rem 1.5rem 5rem' }}>
        <div>
          <span style={{ display: 'inline-block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent)', background: 'var(--surface)', border: '1px solid var(--line)', padding: '4px 12px', borderRadius: 999, marginBottom: '1.25rem' }}>
            For teams with licenses, certifications &amp; permits
          </span>
          <h1 style={{ fontSize: 'clamp(2.3rem, 6vw, 3.6rem)', lineHeight: 1.05, margin: '0 0 1.25rem', letterSpacing: '-0.03em' }}>
            Renewals that<br />manage themselves.
          </h1>
          <p style={{ fontSize: '1.12rem', lineHeight: 1.6, color: 'var(--ink-soft)', margin: '0 0 2rem', maxWidth: 480 }}>
            Stop tracking expiration dates in spreadsheets. RenewalPilot reads your documents, reminds the right people,
            and collects the renewal from their phone. You just click approve.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link href="/signup" style={primaryCta}>Start tracking free</Link>
            <Link href="#how" style={secondaryCta}>See how it works</Link>
          </div>
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
      <section style={{ background: 'var(--surface)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', padding: '5rem 0' }}>
        <div style={container}>
          <h2 style={sectionTitle}>Simple pricing</h2>
          <p style={sectionSub}>One flat price per company. Cancel anytime.</p>
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
                <p style={{ color: 'var(--ink-soft)', fontSize: '0.92rem', lineHeight: 1.55, margin: '0.85rem 0 1.5rem', flex: 1 }}>{p.text}</p>
                <Link href="/signup" style={{ ...(p.popular ? primaryCta : secondaryCta), textAlign: 'center' }}>Get started</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ padding: '5rem 0', textAlign: 'center' }}>
        <div style={container}>
          <h2 style={{ ...sectionTitle, marginBottom: '1rem' }}>Never miss a renewal again.</h2>
          <p style={{ ...sectionSub, marginBottom: '2rem' }}>Set up your team in minutes. Your first reminders go out tomorrow morning.</p>
          <Link href="/signup" style={primaryCta}>Create your account</Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--line)', padding: '1.75rem 0' }}>
        <div style={{ ...container, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', color: 'var(--ink-soft)', fontSize: '0.85rem' }}>
          <span><strong style={{ color: 'var(--ink)' }}>RenewalPilot</strong> · Renewals that manage themselves.</span>
          <span>© {new Date().getFullYear()} RenewalPilot</span>
        </div>
      </footer>
    </div>
  )
}