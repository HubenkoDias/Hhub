import type { Metadata } from 'next'
import { Syne, Outfit, DM_Mono } from 'next/font/google'
import './globals.css'

// Syne — geometric, bold, memorable for headings
const syne = Syne({ subsets:['latin'], variable:'--font-display', display:'swap', weight:['700','800'] })
// Outfit — clean, modern, highly readable for body
const outfit = Outfit({ subsets:['latin'], variable:'--font-body', display:'swap' })
const dmMono = DM_Mono({ subsets:['latin'], weight:['400','500'], variable:'--font-mono', display:'swap' })

export const metadata: Metadata = {
  title: 'HHub — QA Experts. Reliable Results.',
  description: 'Connect with vetted QA specialists or find quality assurance talent for your software projects.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${outfit.variable} ${dmMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
