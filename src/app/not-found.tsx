"use client"

export default function NotFound() {
  return (
    <div style={{ 
      background: '#1A1410', 
      color: '#F5F0E8', 
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ color: '#D4820A', fontSize: '4rem' }}>404</h1>
        <p>Page not found</p>
        <a href="/" style={{ color: '#D4820A' }}>Go home</a>
      </div>
    </div>
  )
}
