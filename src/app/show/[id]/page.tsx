'use client'

import { useState } from 'react'

// Sample data
const sampleShow = {
  id: '1',
  artist: 'The Midnight Souls',
  venue: 'The Blue Note',
  date: 'April 14, 2024',
  time: '8:00 PM',
  description: 'Join us for an unforgettable night with The Midnight Souls as they bring their signature blend of indie rock and soul to The Blue Note. This intimate performance will feature songs from their latest album along with fan favorites from their extensive catalog.',
  price: 35,
  totalTickets: 150,
  ticketsSold: 112,
  musicLinks: {
    spotify: 'https://open.spotify.com/artist/example',
    youtube: 'https://youtube.com/example',
    instagram: 'https://instagram.com/example'
  }
}

export default function ShowPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState<'tickets' | 'promote'>('tickets')
  const [ticketQuantity, setTicketQuantity] = useState(1)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedCaption, setCopiedCaption] = useState(false)

  const ticketsRemaining = sampleShow.totalTickets - sampleShow.ticketsSold
  const soldPercentage = (sampleShow.ticketsSold / sampleShow.totalTickets) * 100
  const totalPrice = sampleShow.price * ticketQuantity

  const showUrl = `https://houseshow.com/show/${sampleShow.id}`
  const instagramCaption = `🎵 Excited to see ${sampleShow.artist} at ${sampleShow.venue} on ${sampleShow.date} at ${sampleShow.time}! 🎫 Get your tickets before they sell out: ${showUrl} #HouseShow #LiveMusic #${sampleShow.artist.replace(/\s+/g, '')}`

  const copyToClipboard = (text: string, type: 'url' | 'caption') => {
    navigator.clipboard.writeText(text)
    if (type === 'url') {
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    } else {
      setCopiedCaption(true)
      setTimeout(() => setCopiedCaption(false), 2000)
    }
  }

  const shareOnTwitter = () => {
    const text = `Seeing ${sampleShow.artist} at ${sampleShow.venue} on ${sampleShow.date}! 🎫 ${showUrl}`
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank')
  }

  const shareOnFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(showUrl)}`, '_blank')
  }

  const shareViaSMS = () => {
    const text = `Come see ${sampleShow.artist} at ${sampleShow.venue} on ${sampleShow.date}! ${showUrl}`
    window.open(`sms:?body=${encodeURIComponent(text)}`, '_blank')
  }

  const handleBuyTickets = () => {
    // Stripe checkout integration would go here
    console.log('Proceeding to Stripe checkout with', ticketQuantity, 'tickets')
  }

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
        
        input, textarea {
          font-family: 'DM Sans', sans-serif;
        }
      `}</style>
      
      {/* Sticky Navigation */}
      <div style={{
        position: 'sticky',
        top: 0,
        backgroundColor: '#1A1410EE',
        borderBottom: '1px solid #D4820A33',
        padding: '16px 0',
        zIndex: 100,
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#F0A500',
            fontFamily: 'Playfair Display, serif'
          }}>
            HouseShow
          </div>
          <div style={{
            fontSize: '14px',
            color: '#8C7B6B'
          }}>
            {sampleShow.artist} • {sampleShow.venue}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '48px 24px'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 380px',
          gap: '48px'
        }}>
          
          {/* Left Side - Show Details */}
          <div>
            <h1 style={{
              fontSize: '48px',
              fontWeight: '700',
              marginBottom: '24px',
              color: '#F5F0E8',
              fontFamily: 'Playfair Display, serif',
              lineHeight: '1.1'
            }}>
              {sampleShow.artist}
            </h1>
            
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '24px',
              marginBottom: '32px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ color: '#D4820A', fontSize: '20px' }}>📍</span>
                <span style={{ fontSize: '16px' }}>{sampleShow.venue}</span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ color: '#D4820A', fontSize: '20px' }}>📅</span>
                <span style={{ fontSize: '16px' }}>{sampleShow.date}</span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ color: '#D4820A', fontSize: '20px' }}>🎵</span>
                <span style={{ fontSize: '16px' }}>{sampleShow.time}</span>
              </div>
            </div>

            <div style={{
              fontSize: '18px',
              lineHeight: '1.6',
              marginBottom: '40px',
              color: '#F5F0E8'
            }}>
              {sampleShow.description}
            </div>

            <div style={{ marginBottom: '40px' }}>
              <h3 style={{
                fontSize: '24px',
                fontWeight: '600',
                marginBottom: '16px',
                color: '#F5F0E8',
                fontFamily: 'Playfair Display, serif'
              }}>
                Listen to {sampleShow.artist}
              </h3>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '16px'
              }}>
                <a
                  href={sampleShow.musicLinks.spotify}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(212,130,10,0.08)',
                    border: '1px solid rgba(212,130,10,0.25)',
                    color: '#F0A500',
                    fontSize: '14px',
                    fontWeight: '500',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(212,130,10,0.12)'
                    e.currentTarget.style.borderColor = 'rgba(212,130,10,0.4)'
                    e.currentTarget.style.transform = 'scale(1.02)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(212,130,10,0.08)'
                    e.currentTarget.style.borderColor = 'rgba(212,130,10,0.25)'
                    e.currentTarget.style.transform = 'scale(1)'
                  }}
                >
                  <span style={{ fontSize: '16px' }}>🎵</span>
                  Spotify
                  <span style={{ fontSize: '12px' }}>↗️</span>
                </a>
                <a
                  href={sampleShow.musicLinks.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(212,130,10,0.08)',
                    border: '1px solid rgba(212,130,10,0.25)',
                    color: '#F0A500',
                    fontSize: '14px',
                    fontWeight: '500',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(212,130,10,0.12)'
                    e.currentTarget.style.borderColor = 'rgba(212,130,10,0.4)'
                    e.currentTarget.style.transform = 'scale(1.02)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(212,130,10,0.08)'
                    e.currentTarget.style.borderColor = 'rgba(212,130,10,0.25)'
                    e.currentTarget.style.transform = 'scale(1)'
                  }}
                >
                  <span style={{ fontSize: '16px' }}>🎵</span>
                  YouTube
                  <span style={{ fontSize: '12px' }}>↗️</span>
                </a>
                <a
                  href={sampleShow.musicLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(212,130,10,0.08)',
                    border: '1px solid rgba(212,130,10,0.25)',
                    color: '#F0A500',
                    fontSize: '14px',
                    fontWeight: '500',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(212,130,10,0.12)'
                    e.currentTarget.style.borderColor = 'rgba(212,130,10,0.4)'
                    e.currentTarget.style.transform = 'scale(1.02)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(212,130,10,0.08)'
                    e.currentTarget.style.borderColor = 'rgba(212,130,10,0.25)'
                    e.currentTarget.style.transform = 'scale(1)'
                  }}
                >
                  <span style={{ fontSize: '16px' }}>🎵</span>
                  Instagram
                  <span style={{ fontSize: '12px' }}>↗️</span>
                </a>
              </div>
            </div>
          </div>

          {/* Right Side - Sticky Ticket Box */}
          <div>
            <div style={{
              position: 'sticky',
              top: '100px',
              padding: '32px',
              borderRadius: '12px',
              border: '2px solid #D4820A',
              backgroundColor: '#2A1F1A'
            }}>
              <div style={{ marginBottom: '32px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '24px'
                }}>
                  <span style={{
                    fontSize: '32px',
                    fontWeight: '700',
                    color: '#F0A500'
                  }}>
                    ${sampleShow.price}
                  </span>
                  <span style={{ fontSize: '24px', color: '#D4820A' }}>🎫</span>
                </div>
                
                <div style={{ marginBottom: '24px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px'
                  }}>
                    <span style={{ fontSize: '14px', color: '#F5F0E8' }}>
                      {ticketsRemaining} tickets remaining
                    </span>
                    <span style={{ fontSize: '14px', color: '#F5F0E8' }}>
                      {soldPercentage.toFixed(0)}% sold
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    backgroundColor: '#4A3C35',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${soldPercentage}%`,
                      height: '100%',
                      backgroundColor: soldPercentage > 80 ? '#DC2626' : '#F0A500',
                      borderRadius: '4px',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('tickets')}
                  style={{
                    width: '100%',
                    padding: '16px',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    backgroundColor: '#D4820A',
                    color: '#1A1410',
                    marginBottom: '12px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  Buy Tickets
                </button>

                <button
                  onClick={() => setActiveTab('promote')}
                  style={{
                    width: '100%',
                    padding: '16px',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    backgroundColor: 'transparent',
                    color: '#F0A500',
                    border: '2px solid #D4820A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <span>📤</span>
                  Share This Show
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Tabs */}
        <div style={{ marginTop: '64px' }}>
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #8C7B6B',
            marginBottom: '24px'
          }}>
            <button
              onClick={() => setActiveTab('tickets')}
              style={{
                padding: '16px 32px',
                fontSize: '16px',
                fontWeight: '600',
                backgroundColor: 'transparent',
                color: activeTab === 'tickets' ? '#F0A500' : '#F5F0E8',
                border: 'none',
                borderBottom: activeTab === 'tickets' ? '4px solid #D4820A' : 'none',
                opacity: activeTab === 'tickets' ? 1 : 0.6,
                cursor: 'pointer'
              }}
            >
              Buy Tickets
            </button>
            <button
              onClick={() => setActiveTab('promote')}
              style={{
                padding: '16px 32px',
                fontSize: '16px',
                fontWeight: '600',
                backgroundColor: 'transparent',
                color: activeTab === 'promote' ? '#F0A500' : '#F5F0E8',
                border: 'none',
                borderBottom: activeTab === 'promote' ? '4px solid #D4820A' : 'none',
                opacity: activeTab === 'promote' ? 1 : 0.6,
                cursor: 'pointer'
              }}
            >
              Promote This Show
            </button>
          </div>

          <div style={{
            padding: '32px',
            borderRadius: '12px',
            backgroundColor: '#2A1F1A'
          }}>
            {activeTab === 'tickets' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px',
                    color: '#F5F0E8'
                  }}>
                    Quantity
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                  }}>
                    <button
                      onClick={() => setTicketQuantity(Math.max(1, ticketQuantity - 1))}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#4A3C35',
                        color: '#F5F0E8',
                        fontSize: '18px',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      −
                    </button>
                    <span style={{
                      fontSize: '20px',
                      fontWeight: '600',
                      width: '40px',
                      textAlign: 'center',
                      color: '#F5F0E8'
                    }}>
                      {ticketQuantity}
                    </span>
                    <button
                      onClick={() => setTicketQuantity(Math.min(ticketsRemaining, ticketQuantity + 1))}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#4A3C35',
                        color: '#F5F0E8',
                        fontSize: '18px',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '16px',
                  borderTop: '1px solid #8C7B6B'
                }}>
                  <span style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#F5F0E8'
                  }}>
                    Total
                  </span>
                  <span style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    color: '#F0A500'
                  }}>
                    ${totalPrice}
                  </span>
                </div>

                <button
                  onClick={handleBuyTickets}
                  style={{
                    width: '100%',
                    padding: '20px',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    backgroundColor: '#D4820A',
                    color: '#1A1410',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <span>🎫</span>
                  Proceed to Checkout
                  <span>→</span>
                </button>
              </div>
            )}

            {activeTab === 'promote' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px',
                    color: '#F5F0E8'
                  }}>
                    Show URL
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={showUrl}
                      readOnly
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: '#4A3C35',
                        color: '#F5F0E8',
                        fontSize: '14px'
                      }}
                    />
                    <button
                      onClick={() => copyToClipboard(showUrl, 'url')}
                      style={{
                        padding: '12px 20px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        backgroundColor: '#D4820A',
                        color: '#1A1410',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <span>📋</span>
                      {copiedUrl ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px',
                    color: '#F5F0E8'
                  }}>
                    Instagram Caption
                  </div>
                  <textarea
                    value={instagramCaption}
                    readOnly
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#4A3C35',
                      color: '#F5F0E8',
                      fontSize: '14px',
                      resize: 'none',
                      fontFamily: 'DM Sans, sans-serif'
                    }}
                  />
                  <button
                    onClick={() => copyToClipboard(instagramCaption, 'caption')}
                    style={{
                      marginTop: '8px',
                      padding: '12px 20px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      backgroundColor: '#D4820A',
                      color: '#1A1410',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <span>📋</span>
                    {copiedCaption ? 'Copied!' : 'Copy Caption'}
                  </button>
                </div>

                <div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '12px',
                    color: '#F5F0E8'
                  }}>
                    Share on Social Media
                  </div>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <button
                      onClick={shareOnTwitter}
                      style={{
                        padding: '12px 20px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        backgroundColor: 'rgba(212,130,10,0.08)',
                        border: '1px solid rgba(212,130,10,0.25)',
                        color: '#F0A500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(212,130,10,0.12)'
                        e.currentTarget.style.borderColor = 'rgba(212,130,10,0.4)'
                        e.currentTarget.style.transform = 'scale(1.02)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(212,130,10,0.08)'
                        e.currentTarget.style.borderColor = 'rgba(212,130,10,0.25)'
                        e.currentTarget.style.transform = 'scale(1)'
                      }}
                    >
                      <span style={{ fontSize: '14px' }}>𝕏</span>
                      Twitter
                    </button>
                    <button
                      onClick={shareOnFacebook}
                      style={{
                        padding: '12px 20px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        backgroundColor: 'rgba(212,130,10,0.08)',
                        border: '1px solid rgba(212,130,10,0.25)',
                        color: '#F0A500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(212,130,10,0.12)'
                        e.currentTarget.style.borderColor = 'rgba(212,130,10,0.4)'
                        e.currentTarget.style.transform = 'scale(1.02)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(212,130,10,0.08)'
                        e.currentTarget.style.borderColor = 'rgba(212,130,10,0.25)'
                        e.currentTarget.style.transform = 'scale(1)'
                      }}
                    >
                      <span style={{ fontSize: '14px' }}>f</span>
                      Facebook
                    </button>
                    <button
                      onClick={shareViaSMS}
                      style={{
                        padding: '12px 20px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        backgroundColor: 'rgba(212,130,10,0.08)',
                        border: '1px solid rgba(212,130,10,0.25)',
                        color: '#F0A500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(212,130,10,0.12)'
                        e.currentTarget.style.borderColor = 'rgba(212,130,10,0.4)'
                        e.currentTarget.style.transform = 'scale(1.02)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(212,130,10,0.08)'
                        e.currentTarget.style.borderColor = 'rgba(212,130,10,0.25)'
                        e.currentTarget.style.transform = 'scale(1)'
                      }}
                    >
                      <span style={{ fontSize: '14px' }}>💬</span>
                      Text a Friend
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
