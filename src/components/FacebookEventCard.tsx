'use client'

import { useState } from 'react'

interface Props {
  artistName: string
  artistBio?: string
  venueName: string
  neighborhood: string
  date: string
  time: string
  ticketPrice: string
  ticketUrl: string
  accessToken: string
}

interface GeneratedContent {
  eventTitle: string
  eventDescription: string
  hostCaption: string
  artistCaption: string
  coverPhotoText: string
}

const SECTIONS: { key: keyof GeneratedContent; label: string; description: string }[] = [
  { key: 'eventTitle', label: 'Event Title', description: 'Paste as the Facebook event name' },
  { key: 'eventDescription', label: 'Event Description', description: 'Paste into the Facebook event description field' },
  { key: 'hostCaption', label: 'Host Caption', description: 'Share on your personal feed to invite friends' },
  { key: 'artistCaption', label: 'Artist Caption', description: "For the artist's social media announcement" },
  { key: 'coverPhotoText', label: 'Cover Photo Text', description: 'Text layout for the event cover image' },
]

export default function FacebookEventCard({
  artistName,
  artistBio,
  venueName,
  neighborhood,
  date,
  time,
  ticketPrice,
  ticketUrl,
  accessToken,
}: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle')
  const [content, setContent] = useState<GeneratedContent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<keyof GeneratedContent | null>(null)

  const generate = async () => {
    setStatus('loading')
    setError(null)

    try {
      const res = await fetch('/api/generate-facebook-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ artistName, artistBio, venueName, neighborhood, date, time, ticketPrice, ticketUrl }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Generation failed')
      }

      const data = await res.json()
      setContent(data)
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStatus('idle')
    }
  }

  const copyToClipboard = async (key: keyof GeneratedContent) => {
    if (!content) return
    try {
      await navigator.clipboard.writeText(content[key])
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // fallback for older browsers
    }
  }

  const containerStyle: React.CSSProperties = {
    border: '1px solid rgba(212,130,10,0.2)',
    borderRadius: '12px',
    padding: '28px 24px',
    background: 'rgba(44,34,24,0.3)',
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: "'Space Mono', monospace",
    fontSize: '0.68rem',
    color: '#D4820A',
    letterSpacing: '3px',
    textTransform: 'uppercase',
    marginBottom: '16px',
  }

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div style={labelStyle as React.CSSProperties}>Facebook Event Generator</div>
        <div style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '0.72rem',
          color: '#4A4240',
          background: 'rgba(74,66,64,0.2)',
          border: '1px solid rgba(74,66,64,0.3)',
          borderRadius: '4px',
          padding: '2px 8px',
          letterSpacing: '0.5px',
        }}>
          AI-powered
        </div>
      </div>

      {status === 'idle' && (
        <div>
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '0.9rem',
            color: '#8C7B6B',
            lineHeight: 1.6,
            marginBottom: '20px',
          }}>
            Generate a Facebook event title, description, host &amp; artist captions, and cover photo text — tailored to your show.
          </p>
          {error && (
            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '0.85rem',
              color: '#FCA5A5',
              marginBottom: '16px',
            }}>
              {error}
            </p>
          )}
          <button
            onClick={generate}
            style={{
              background: '#1877F2',
              color: '#fff',
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Generate Facebook Event Copy
          </button>
        </div>
      )}

      {status === 'loading' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '20px 0',
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '0.9rem',
          color: '#8C7B6B',
        }}>
          <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>◌</span>
          Writing your event copy…
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {status === 'done' && content && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {SECTIONS.map(({ key, label, description }) => (
            <div key={key} style={{
              background: 'rgba(26,20,16,0.5)',
              border: '1px solid rgba(212,130,10,0.12)',
              borderRadius: '8px',
              padding: '16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <div style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: '0.6rem',
                    color: '#D4820A',
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    marginBottom: '2px',
                  }}>
                    {label}
                  </div>
                  <div style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '0.75rem',
                    color: '#4A4240',
                  }}>
                    {description}
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(key)}
                  style={{
                    background: copied === key ? 'rgba(240,165,0,0.15)' : 'rgba(212,130,10,0.1)',
                    border: '1px solid rgba(212,130,10,0.25)',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '0.78rem',
                    color: copied === key ? '#F0A500' : '#D4820A',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    marginLeft: '12px',
                  }}
                >
                  {copied === key ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '0.88rem',
                color: '#D9C6A5',
                lineHeight: 1.6,
                margin: 0,
                whiteSpace: 'pre-wrap',
              }}>
                {content[key]}
              </p>
            </div>
          ))}

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', paddingTop: '4px' }}>
            <a
              href="https://www.facebook.com/events/create"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: '#1877F2',
                color: '#fff',
                padding: '12px 20px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            >
              Open Facebook Create Event →
            </a>
            <button
              onClick={generate}
              style={{
                background: 'transparent',
                border: '1px solid rgba(212,130,10,0.3)',
                borderRadius: '8px',
                padding: '12px 20px',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '0.9rem',
                color: '#D4820A',
                cursor: 'pointer',
              }}
            >
              Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
