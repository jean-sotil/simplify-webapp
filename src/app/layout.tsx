import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { JsonLd } from '@/components/common/JsonLd'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Simplify — Document Intelligence Platform',
  description: 'AI-powered document analysis for engineering teams.',
}

const softwareApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Simplify',
  applicationCategory: 'BusinessApplication',
  description: 'AI-powered document analysis for engineering teams.',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <JsonLd data={softwareApplicationSchema} />
        {children}
      </body>
    </html>
  )
}
