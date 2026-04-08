import type { Metadata } from 'next'
import { Playfair_Display, DM_Sans, DM_Mono } from 'next/font/google'
import './globals.css'

const playfair = Playfair_Display({ subsets:['latin'], variable:'--font-display', display:'swap' })
const dmSans   = DM_Sans({ subsets:['latin'], variable:'--font-body', display:'swap' })
const dmMono   = DM_Mono({ subsets:['latin'], weight:['400','500'], variable:'--font-mono', display:'swap' })

export const metadata: Metadata = {
  title: 'HHub — QA Experts. Reliable Results.',
  description: 'Connect with vetted QA specialists or find quality assurance talent for your software projects.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable} ${dmMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
