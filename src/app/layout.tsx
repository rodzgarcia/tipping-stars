import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Tipping Stars — FIFA World Cup 2026',
  description: 'The ultimate World Cup tipping competition',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="pitch-bg">{children}</body>
    </html>
  )
}
