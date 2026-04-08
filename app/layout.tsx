import type { Metadata } from 'next'
import { Cormorant_Garamond, Plus_Jakarta_Sans, DM_Mono } from 'next/font/google'
import './globals.css'

// Cormorant Garamond — elegant serif, sophisticated, great for luxury/professional brands
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['600', '700'],
})
// Plus Jakarta Sans — modern, geometric, clean — pairs perfectly with Cormorant
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
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
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${jakarta.variable} ${dmMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
