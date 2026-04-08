import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { DM_Sans, DM_Mono } from 'next/font/google'
import './globals.css'

// DM Sans — clean, geometric, modern. Used by major SaaS products
const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'HHub — QA Experts. Reliable Results.',
  description: 'Connect with vetted QA specialists or find quality assurance talent for your software projects.',
  openGraph: {
    title: 'HHub — QA Experts. Reliable Results.',
    description: 'The trusted QA platform connecting verified testers with companies.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${dmMono.variable}`}>
      <body style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>{children}</body>
    </html>
  )
}
