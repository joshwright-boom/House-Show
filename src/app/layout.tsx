import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'HouseShow — Live Music, Unlocked',
  description: 'Book intimate live performances. Split the door. Build your scene.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
