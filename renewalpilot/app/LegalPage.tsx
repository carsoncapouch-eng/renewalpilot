import Link from 'next/link'
import { SITE } from '@/lib/site'

export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string
  intro: string
  children: React.ReactNode
}) {
  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '3rem 1.5rem 4rem' }}>
      <Link
        href="/"
        style={{ color: 'var(--accent, #2563eb)', fontWeight: 700, textDecoration: 'none', fontSize: '1.1rem' }}
      >
        {SITE.name}
      </Link>
      <h1 style={{ fontSize: '2rem', margin: '1.5rem 0 0.4rem', color: 'var(--ink, #111827)' }}>{title}</h1>
      <p style={{ color: 'var(--ink-soft, #6b7280)', margin: '0 0 0.5rem', fontSize: '0.9rem' }}>
        Effective {SITE.effectiveDate}
      </p>
      <p style={{ color: 'var(--ink-soft, #4b5563)', lineHeight: 1.7, margin: '1rem 0 2rem' }}>{intro}</p>
      <div style={{ color: 'var(--ink, #1f2937)', lineHeight: 1.7, fontSize: '0.97rem' }}>{children}</div>
      <p style={{ marginTop: '3rem', fontSize: '0.9rem', color: 'var(--ink-soft, #6b7280)' }}>
        Questions? Email{' '}
        <a href={`mailto:${SITE.contactEmail}`} style={{ color: 'var(--accent, #2563eb)' }}>
          {SITE.contactEmail}
        </a>
        .
      </p>
    </main>
  )
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '1.75rem' }}>
      <h2 style={{ fontSize: '1.15rem', margin: '0 0 0.5rem', color: 'var(--ink, #111827)' }}>{title}</h2>
      {children}
    </section>
  )
}