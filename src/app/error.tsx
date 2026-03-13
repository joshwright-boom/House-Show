'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error)
  }, [error])

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'DM Sans', sans-serif;
          background-color: #1A1410;
          color: #F5F0E8;
        }
        
        .heading {
          font-family: 'Playfair Display', serif;
        }
      `}</style>

      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '64px',
          marginBottom: '24px'
        }}>
          ⚠️
        </div>
        
        <h1 style={{
          fontSize: '36px',
          fontWeight: '700',
          marginBottom: '16px',
          color: '#F5F0E8',
          fontFamily: 'Playfair Display, serif'
        }}>
          Something went wrong
        </h1>
        
        <p style={{
          fontSize: '18px',
          lineHeight: '1.6',
          color: '#8C7B6B',
          maxWidth: '600px',
          marginBottom: '32px'
        }}>
          We encountered an unexpected error. This has been logged and we'll work to fix it.
        </p>

        {error.digest && (
          <div style={{
            backgroundColor: 'rgba(220, 38, 38, 0.1)',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '32px',
            fontSize: '14px',
            color: '#FCA5A5',
            fontFamily: 'monospace'
          }}>
            Error ID: {error.digest}
          </div>
        )}
        
        <div style={{
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          <button
            onClick={reset}
            style={{
              padding: '16px 32px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              backgroundColor: '#D4820A',
              color: '#1A1410',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F0A500'
              e.currentTarget.style.transform = 'scale(1.02)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#D4820A'
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            Try again
          </button>
          
          <a
            href="/"
            style={{
              display: 'inline-block',
              padding: '16px 32px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              backgroundColor: 'transparent',
              color: '#F0A500',
              border: '2px solid #D4820A',
              textDecoration: 'none',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(212,130,10,0.08)'
              e.currentTarget.style.transform = 'scale(1.02)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            Go home
          </a>
        </div>
      </div>
    </>
  )
}
