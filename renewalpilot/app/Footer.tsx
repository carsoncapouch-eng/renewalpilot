import Link from 'next/link'
import { SITE } from '@/lib/site'

const link: React.CSSProperties = {
  color: 'var(--ink-soft, #6b7280)',
  textDecoration: 'none',
}

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--line, #e5e7eb)',
        marginTop: '3rem',
        padding: '1.5rem 1rem',
        fontSize: '0.85rem',
        color: 'var(--ink-soft, #6b7280)',
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem 1.5rem',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>
          © {new Date().getFullYear()} {SITE.name}
        </span>
        <nav style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
          <Link href="/terms" style={link}>
            Terms
          </Link>
          <Link href="/privacy" style={link}>
            Privacy
          </Link>
          <a href={`mailto:${SITE.contactEmail}`} style={link}>
            Contact
          </a>
        </nav>
      </div>
    </footer>
  )
}