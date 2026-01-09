import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Confidential Collaborative Analytics Platform',
  description: 'Privacy-preserving financial risk scoring using TEE and Differential Privacy',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

