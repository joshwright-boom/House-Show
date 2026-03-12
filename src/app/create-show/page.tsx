'use client'

import { useState } from 'react'

interface FormData {
  artist_name: string
  venue_name: string
  venue_address: string
  show_date: string
  show_time: string
  ticket_price: number
  capacity: number
  description: string
  spotify_url: string
  youtube_url: string
  instagram_url: string
}

export default function CreateShowPage() {
  const [formData, setFormData] = useState<FormData>({
    artist_name: '',
    venue_name: '',
    venue_address: '',
    show_date: '',
    show_time: '8:00 PM',
    ticket_price: 0,
    capacity: 0,
    description: '',
    spotify_url: '',
    youtube_url: '',
    instagram_url: ''
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showUrl, setShowUrl] = useState('')
  const [copiedLink, setCopiedLink] = useState(false)

  const generateSlug = (artistName: string, showDate: string) => {
    const cleanArtist = artistName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    const dateObj = new Date(showDate)
    const dateStr = dateObj.toISOString().split('T')[0]
    return `${cleanArtist}-${dateStr}`
  }

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const copyShowLink = () => {
    navigator.clipboard.writeText(showUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Generate slug for the show
      const slug = generateSlug(formData.artist_name, formData.show_date)
      const fullShowUrl = `https://houseshow.net/show/${slug}`

      // Save to Supabase (mock implementation)
      const showData = {
        ...formData,
        slug,
        status: 'on_sale',
        tickets_sold: 0,
        created_at: new Date().toISOString()
      }

      // Mock API call - replace with actual Supabase implementation
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // console.log('Saving to Supabase:', showData)
      
      setShowUrl(fullShowUrl)
      setShowSuccess(true)
    } catch (error) {
      console.error('Error creating show:', error)
      alert('Failed to create show. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (showSuccess) {
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
          borderBottom: '1px solid rgba(212,130,10,0.25)',
          padding: '16px 0',
          zIndex: 100,
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            maxWidth: '800px',
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
              Show Created Successfully
            </div>
          </div>
        </div>

        {/* Success Content */}
        <div style={{
          maxWidth: '600px',
          margin: '0 auto',
          padding: '80px 24px',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '24px'
          }}>
            🎉
          </div>
          
          <h1 style={{
            fontSize: '36px',
            fontWeight: '700',
            marginBottom: '16px',
            color: '#F5F0E8',
            fontFamily: 'Playfair Display, serif'
          }}>
            Your Show is Live!
          </h1>
          
          <p style={{
            fontSize: '18px',
            lineHeight: '1.6',
            marginBottom: '40px',
            color: '#8C7B6B'
          }}>
            {formData.artist_name} at {formData.venue_name} is now available for fans to discover and purchase tickets.
          </p>

          <div style={{
            backgroundColor: 'rgba(212,130,10,0.08)',
            border: '1px solid rgba(212,130,10,0.25)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '32px'
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '8px',
              color: '#F0A500'
            }}>
              Your Show URL
            </div>
            <div style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#F5F0E8',
              marginBottom: '16px',
              wordBreak: 'break-all'
            }}>
              {showUrl}
            </div>
            <button
              onClick={copyShowLink}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                backgroundColor: '#D4820A',
                color: '#1A1410',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
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
              <span>📋</span>
              {copiedLink ? 'Link Copied!' : 'Copy Link'}
            </button>
          </div>

          <div style={{
            fontSize: '14px',
            color: '#8C7B6B',
            lineHeight: '1.5'
          }}>
            Share this link with your fans on social media to start selling tickets immediately. 
            You can always find your show in your HouseShow dashboard.
          </div>
        </div>
      </>
    )
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
        borderBottom: '1px solid rgba(212,130,10,0.25)',
        padding: '16px 0',
        zIndex: 100,
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{
          maxWidth: '800px',
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
            Create New Show
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '48px 24px'
      }}>
        <div style={{
          marginBottom: '48px'
        }}>
          <h1 style={{
            fontSize: '42px',
            fontWeight: '700',
            marginBottom: '16px',
            color: '#F5F0E8',
            fontFamily: 'Playfair Display, serif'
          }}>
            Create Your Show
          </h1>
          <p style={{
            fontSize: '18px',
            lineHeight: '1.6',
            color: '#8C7B6B'
          }}>
            Fill in the details below to create your public show listing. Fans will be able to discover and purchase tickets immediately.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '32px',
            marginBottom: '32px'
          }}>
            {/* Left Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px',
                  color: '#F5F0E8'
                }}>
                  Artist Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.artist_name}
                  onChange={(e) => handleInputChange('artist_name', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(212,130,10,0.25)',
                    backgroundColor: 'rgba(212,130,10,0.05)',
                    color: '#F5F0E8',
                    fontSize: '16px',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(212,130,10,0.5)'
                    e.currentTarget.style.backgroundColor = 'rgba(212,130,10,0.08)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(212,130,10,0.25)'
                    e.currentTarget.style.backgroundColor = 'rgba(212,130,10,0.05)'
                  }}
                  placeholder="The Midnight Souls"
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px',
                  color: '#F5F0E8'
                }}>
                  Venue Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.venue_name}
                  onChange={(e) => handleInputChange('venue_name', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(212,130,10,0.25)',
                    backgroundColor: 'rgba(212,130,10,0.05)',
                    color: '#F5F0E8',
                    fontSize: '16px',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(212,130,10,0.5)'
                    e.currentTarget.style.backgroundColor = 'rgba(212,130,10,0.08)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(212,130,10,0.25)'
                    e.currentTarget.style.backgroundColor = 'rgba(212,130,10,0.05)'
                  }}
                  placeholder="The Blue Note"
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px',
                  color: '#F5F0E8'
                }}>
                  Venue Address *
                </label>
                <input
                  type="text"
                  required
                  value={formData.venue_address}
                  onChange={(e) => handleInputChange('venue_address', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(212,130,10,0.25)',
                    backgroundColor: 'rgba(212,130,10,0.05)',
                    color: '#F5F0E8',
                    fontSize: '16px',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(212,130,10,0.5)'
                    e.currentTarget.style.backgroundColor = 'rgba(212,130,10,0.08)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(212,130,10,0.25)'
                    e.currentTarget.style.backgroundColor = 'rgba(212,130,10,0.05)'
                  }}
                  placeholder="123 Main St, City, State 12345"
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px',
                  color: '#F5F0E8'
                }}>
                  Show Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.show_date}
                  onChange={(e) => handleInputChange('show_date', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(212,130,10,0.25)',
                    backgroundColor: 'rgba(212,130,10,0.05)',
                    color: '#F5F0E8',
                    fontSize: '16px',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(212,130,10,0.5)'
                    e.currentTarget.style.backgroundColor = 'rgba(212,130,10,0.08)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(212,130,10,0.25)'
                    e.currentTarget.style.backgroundColor = 'rgba(212,130,10,0.05)'
                  }}
                />
              </div>
            </div>

            {/* Right Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px',
                  color: '#F5F0E8'
                }}>
                  Show Time *
                </label>
                <input
                  type="text"
                  required
                  value={formData.show_time}
                  onChange={(e) => handleInputChange('show_time', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(212,130,10,0.25)',
                    backgroundColor: 'rgba(212,130,10,0.05)',
                    color: '#F5F0E8',
                    fontSize: '16px',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(212,130,10,0.5)'
                    e.currentTarget.style.backgroundColor = 'rgba(212,130,10,0.08)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(212,130,10,0.25)'
                    e.currentTarget.style.backgroundColor = 'rgba(212,130,10,0.05)'
                  }}
                  placeholder="8:00 PM"
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px',
                  color: '#F5F0E8'
                }}>
                  Ticket Price ($) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.ticket_price}
                  onChange={(e) => handleInputChange('ticket_price', parseFloat(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(212,130,10,0.25)',
                    backgroundColor: 'rgba(212,130,10,0.05)',
                    color: '#F5F0E8',
                    fontSize: '16px',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(212,130,10,0.5)'
                    e.currentTarget.style.backgroundColor = 'rgba(212,130,10,0.08)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(212,130,10,0.25)'
                    e.currentTarget.style.backgroundColor = 'rgba(212,130,10,0.05)'
                  }}
                  placeholder="35.00"
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px',
                  color: '#F5F0E8'
                }}>
                  Capacity (Max Tickets) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.capacity}
                  onChange={(e) => handleInputChange('capacity', parseInt(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(212,130,10,0.25)',
                    backgroundColor: 'rgba(212,130,10,0.05)',
                    color: '#F5F0E8',
                    fontSize: '16px',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(212,130,10,0.5)'
                    e.currentTarget.style.backgroundColor = 'rgba(212,130,10,0.08)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(212,130,10,0.25)'
                    e.currentTarget.style.backgroundColor = 'rgba(212,130,10,0.05)'
                  }}
                  placeholder="150"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '8px',
              color: '#F5F0E8'
            }}>
              Description (Pitch to Fans) *
            </label>
            <textarea
              required
              rows={4}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(212,130,10,0.25)',
                backgroundColor: 'rgba(212,130,10,0.05)',
                color: '#F5F0E8',
                fontSize: '16px',
                resize: 'vertical',
                minHeight: '120px',
                transition: 'all 0.2s ease',
                fontFamily: 'DM Sans, sans-serif'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(212,130,10,0.5)'
                e.currentTarget.style.backgroundColor = 'rgba(212,130,10,0.08)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(212,130,10,0.25)'
                e.currentTarget.style.backgroundColor = 'rgba(212,130,10,0.05)'
              }}
              placeholder="Join us for an unforgettable night with amazing music and great vibes..."
            />
          </div>

          {/* Optional Links */}
          <div style={{ marginBottom: '40px' }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              marginBottom: '16px',
              color: '#F5F0E8',
              fontFamily: 'Playfair Display, serif'
            }}>
              Music Links (Optional)
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '16px'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px',
                  color: '#8C7B6B'
                }}>
                  Spotify URL
                </label>
                <input
                  type="url"
                  value={formData.spotify_url}
                  onChange={(e) => handleInputChange('spotify_url', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(212,130,10,0.25)',
                    backgroundColor: 'rgba(212,130,10,0.05)',
                    color: '#F5F0E8',
                    fontSize: '14px',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(212,130,10,0.5)'
                    e.currentTarget.style.backgroundColor = 'rgba(212,130,10,0.08)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(212,130,10,0.25)'
                    e.currentTarget.style.backgroundColor = 'rgba(212,130,10,0.05)'
                  }}
                  placeholder="https://open.spotify.com/artist/..."
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px',
                  color: '#8C7B6B'
                }}>
                  YouTube URL
                </label>
                <input
                  type="url"
                  value={formData.youtube_url}
                  onChange={(e) => handleInputChange('youtube_url', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(212,130,10,0.25)',
                    backgroundColor: 'rgba(212,130,10,0.05)',
                    color: '#F5F0E8',
                    fontSize: '14px',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(212,130,10,0.5)'
                    e.currentTarget.style.backgroundColor = 'rgba(212,130,10,0.08)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(212,130,10,0.25)'
                    e.currentTarget.style.backgroundColor = 'rgba(212,130,10,0.05)'
                  }}
                  placeholder="https://youtube.com/..."
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px',
                  color: '#8C7B6B'
                }}>
                  Instagram URL
                </label>
                <input
                  type="url"
                  value={formData.instagram_url}
                  onChange={(e) => handleInputChange('instagram_url', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(212,130,10,0.25)',
                    backgroundColor: 'rgba(212,130,10,0.05)',
                    color: '#F5F0E8',
                    fontSize: '14px',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(212,130,10,0.5)'
                    e.currentTarget.style.backgroundColor = 'rgba(212,130,10,0.08)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(212,130,10,0.25)'
                    e.currentTarget.style.backgroundColor = 'rgba(212,130,10,0.05)'
                  }}
                  placeholder="https://instagram.com/..."
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div style={{ textAlign: 'center' }}>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '16px 48px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                backgroundColor: isSubmitting ? '#8C7B6B' : '#D4820A',
                color: '#1A1410',
                border: 'none',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: isSubmitting ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.backgroundColor = '#F0A500'
                  e.currentTarget.style.transform = 'scale(1.02)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.backgroundColor = '#D4820A'
                  e.currentTarget.style.transform = 'scale(1)'
                }
              }}
            >
              {isSubmitting ? 'Creating Show...' : 'Create Show'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
