'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Show {
  id: string
  show_name: string
  venue_name: string
  venue_address: string
  date: string
  time: string
  ticket_price: number
  max_capacity: number
  show_description: string
  genre_preference: string
  host_id: string
  status: 'open' | 'booked' | 'cancelled'
  created_at: string
}

export default function CreateShow() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    show_name: '',
    venue_name: '',
    venue_address: '',
    date: '',
    time: '',
    ticket_price: '',
    max_capacity: '',
    show_description: '',
    genre_preference: 'Any'
  })
  
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      
      // Check if user is a host
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single()
      
      if (profile?.user_type !== 'host') {
        router.push('/dashboard')
        return
      }
      
      setUser({ id: user.id, email: user.email })
    }
    
    checkUser()
  }, [router])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    
    setLoading(true)
    
    try {
      const showData = {
        show_name: formData.show_name,
        venue_name: formData.venue_name,
        venue_address: formData.venue_address,
        date: formData.date,
        time: formData.time,
        ticket_price: parseFloat(formData.ticket_price),
        max_capacity: parseInt(formData.max_capacity),
        show_description: formData.show_description,
        genre_preference: formData.genre_preference,
        host_id: user.id,
        status: 'open',
        created_at: new Date().toISOString()
      }
      
      // Save to Supabase
      const { error } = await supabase
        .from('shows')
        .insert(showData)
      
      if (error) {
        console.error('Error creating show:', error)
        alert('Error creating show. Please try again.')
        return
      }
      
      // Redirect to bookings page
      router.push('/bookings')
    } catch (error) {
      console.error('Error creating show:', error)
      alert('Error creating show. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return <div style={{ minHeight: '100vh', background: '#1A1410', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#8C7B6B' }}>Loading...</p>
    </div>
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
          background: #1A1410;
          color: '#F5F0E8';
          font-family: 'DM Sans', sans-serif;
        }
      `}</style>
      
      <main style={{ minHeight: '100vh', background: '#1A1410', padding: '48px' }}>
        <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '64px' }}>
          <a href="/dashboard" style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', color: '#F0A500' }}>HouseShow</a>
          <a href="/bookings" style={{ color: '#8C7B6B', fontSize: '0.9rem', textDecoration: 'none' }}>← Back to Bookings</a>
        </nav>

        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', color: '#D4820A', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '16px' }}>
            Create Show
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', color: '#F5F0E8', marginBottom: '16px' }}>
            Host a House Show
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#8C7B6B', fontSize: '1rem', marginBottom: '48px' }}>
            Create a listing for your house show and connect with talented musicians in your area.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Show Name */}
            <div>
              <label style={{
                display: 'block',
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.1rem',
                color: '#F5F0E8',
                marginBottom: '12px'
              }}>
                Show Name
              </label>
              <input
                type="text"
                value={formData.show_name}
                onChange={(e) => handleInputChange('show_name', e.target.value)}
                placeholder="e.g., Cozy Acoustic Night"
                required
                style={{
                  width: '100%',
                  padding: '16px',
                  border: '1px solid rgba(212,130,10,0.2)',
                  borderRadius: '8px',
                  background: 'rgba(44,34,24,0.3)',
                  color: '#F5F0E8',
                  fontSize: '1rem',
                  fontFamily: "'DM Sans', sans-serif"
                }}
              />
            </div>

            {/* Venue Name */}
            <div>
              <label style={{
                display: 'block',
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.1rem',
                color: '#F5F0E8',
                marginBottom: '12px'
              }}>
                Venue Name
              </label>
              <input
                type="text"
                value={formData.venue_name}
                onChange={(e) => handleInputChange('venue_name', e.target.value)}
                placeholder="e.g., Sarah's Living Room"
                required
                style={{
                  width: '100%',
                  padding: '16px',
                  border: '1px solid rgba(212,130,10,0.2)',
                  borderRadius: '8px',
                  background: 'rgba(44,34,24,0.3)',
                  color: '#F5F0E8',
                  fontSize: '1rem',
                  fontFamily: "'DM Sans', sans-serif"
                }}
              />
            </div>

            {/* Venue Address */}
            <div>
              <label style={{
                display: 'block',
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.1rem',
                color: '#F5F0E8',
                marginBottom: '12px'
              }}>
                Venue Address
              </label>
              <input
                type="text"
                value={formData.venue_address}
                onChange={(e) => handleInputChange('venue_address', e.target.value)}
                placeholder="123 Main St, City, State"
                required
                style={{
                  width: '100%',
                  padding: '16px',
                  border: '1px solid rgba(212,130,10,0.2)',
                  borderRadius: '8px',
                  background: 'rgba(44,34,24,0.3)',
                  color: '#F5F0E8',
                  fontSize: '1rem',
                  fontFamily: "'DM Sans', sans-serif"
                }}
              />
            </div>

            {/* Date and Time */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '1.1rem',
                  color: '#F5F0E8',
                  marginBottom: '12px'
                }}>
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '16px',
                    border: '1px solid rgba(212,130,10,0.2)',
                    borderRadius: '8px',
                    background: 'rgba(44,34,24,0.3)',
                    color: '#F5F0E8',
                    fontSize: '1rem',
                    fontFamily: "'DM Sans', sans-serif"
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '1.1rem',
                  color: '#F5F0E8',
                  marginBottom: '12px'
                }}>
                  Time
                </label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => handleInputChange('time', e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '16px',
                    border: '1px solid rgba(212,130,10,0.2)',
                    borderRadius: '8px',
                    background: 'rgba(44,34,24,0.3)',
                    color: '#F5F0E8',
                    fontSize: '1rem',
                    fontFamily: "'DM Sans', sans-serif"
                  }}
                />
              </div>
            </div>

            {/* Ticket Price and Capacity */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '1.1rem',
                  color: '#F5F0E8',
                  marginBottom: '12px'
                }}>
                  Ticket Price ($)
                </label>
                <input
                  type="number"
                  value={formData.ticket_price}
                  onChange={(e) => handleInputChange('ticket_price', e.target.value)}
                  placeholder="25"
                  min="1"
                  step="0.01"
                  required
                  style={{
                    width: '100%',
                    padding: '16px',
                    border: '1px solid rgba(212,130,10,0.2)',
                    borderRadius: '8px',
                    background: 'rgba(44,34,24,0.3)',
                    color: '#F5F0E8',
                    fontSize: '1rem',
                    fontFamily: "'DM Sans', sans-serif"
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '1.1rem',
                  color: '#F5F0E8',
                  marginBottom: '12px'
                }}>
                  Max Capacity
                </label>
                <input
                  type="number"
                  value={formData.max_capacity}
                  onChange={(e) => handleInputChange('max_capacity', e.target.value)}
                  placeholder="20"
                  min="1"
                  required
                  style={{
                    width: '100%',
                    padding: '16px',
                    border: '1px solid rgba(212,130,10,0.2)',
                    borderRadius: '8px',
                    background: 'rgba(44,34,24,0.3)',
                    color: '#F5F0E8',
                    fontSize: '1rem',
                    fontFamily: "'DM Sans', sans-serif"
                  }}
                />
              </div>
            </div>

            {/* Genre Preference */}
            <div>
              <label style={{
                display: 'block',
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.1rem',
                color: '#F5F0E8',
                marginBottom: '12px'
              }}>
                Genre Preference
              </label>
              <select
                value={formData.genre_preference}
                onChange={(e) => handleInputChange('genre_preference', e.target.value)}
                style={{
                  width: '100%',
                  padding: '16px',
                  border: '1px solid rgba(212,130,10,0.2)',
                  borderRadius: '8px',
                  background: 'rgba(44,34,24,0.3)',
                  color: '#F5F0E8',
                  fontSize: '1rem',
                  fontFamily: "'DM Sans', sans-serif"
                }}
              >
                <option value="Any">Any</option>
                <option value="Folk/Acoustic">Folk/Acoustic</option>
                <option value="Jazz">Jazz</option>
                <option value="Rock">Rock</option>
                <option value="Classical">Classical</option>
                <option value="Electronic">Electronic</option>
                <option value="Hip-Hop">Hip-Hop</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Show Description */}
            <div>
              <label style={{
                display: 'block',
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.1rem',
                color: '#F5F0E8',
                marginBottom: '12px'
              }}>
                Show Description
              </label>
              <textarea
                value={formData.show_description}
                onChange={(e) => handleInputChange('show_description', e.target.value)}
                placeholder="Describe your venue, the atmosphere, and what kind of show you're looking to host..."
                rows={4}
                required
                style={{
                  width: '100%',
                  padding: '16px',
                  border: '1px solid rgba(212,130,10,0.2)',
                  borderRadius: '8px',
                  background: 'rgba(44,34,24,0.3)',
                  color: '#F5F0E8',
                  fontSize: '1rem',
                  fontFamily: "'DM Sans', sans-serif",
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #D4820A, #F0A500)',
                color: '#1A1410',
                padding: '16px 32px',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Creating Show...' : 'Create Show'}
            </button>
          </form>
        </div>
      </main>
    </>
  )
}
