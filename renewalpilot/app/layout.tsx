import type { Metadata } from 'next'
import './globals.css'
import Header from './Header'

export const metadata: Metadata = {
  title: 'RenewalPilot',
  description: 'Track renewals before they lapse',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        {children}
      </body>
    </html>
  )
}