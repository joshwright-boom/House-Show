import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'HouseShow — Live Music, Unlocked',
  description: 'Book intimate live performances. Split the door. Build your scene.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <footer
          style={{
            background: '#1A1410',
            color: '#8C7B6B',
            textAlign: 'center',
            fontSize: '0.85rem',
            padding: '24px',
            borderTop: '1px solid rgba(212,130,10,0.35)'
          }}
        >
          We&apos;re building this together —{' '}
          <a
            href="mailto:houseshow777@gmail.com?subject=HouseShow%20Suggestion&body=Hi%2C%20I%20have%20a%20suggestion%20for%20HouseShow%3A%0A%0A"
            style={{ color: '#D4820A', textDecoration: 'none' }}
          >
            Share a suggestion
          </a>
        </footer>
      </body>
    </html>
  )
}
