import type { Metadata } from 'next'
import { Fraunces, Inter, DM_Mono } from 'next/font/google'
import './globals.css'

// Fraunces — optical serif, striking, prestigious. Used by Notion, Linear-style brands
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['600', '700', '900'],
})
// Inter — the gold standard for clean UI text, highly legible
const inter = Inter({
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
  openGraph: {
    title: 'HHub — QA Experts. Reliable Results.',
    description: 'The trusted QA platform connecting verified testers with companies.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} ${dmMono.variable}`}>
      <body className="font-body">{children}</body>
    </html>
  )
}
