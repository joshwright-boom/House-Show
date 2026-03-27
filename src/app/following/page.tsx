'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface FollowRow {
  fan_id: string
  musician_id: string
}

interface MusicianProfile {
  id: string
  name?: string | null
  photo_url?: string | null
  bio?: string | null
}

export default function FollowingPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [musicians, setMusicians] = useState<MusicianProfile[]>([])

  useEffect(() => {
    const loadFollowing = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          window.location.href = '/auth/login?redirect=/following'
          return
        }
        setUserId(user.id)

        const { data: follows, error: followsError } = await supabase
          .from('follows')
          .select('fan_id, musician_id')
          .eq('fan_id', user.id)

        if (followsError) {
          console.error('Follows query error:', followsError)
          setMusicians([])
          return
        }

        const followedIds = (follows || []).map((row: FollowRow) => row.musician_id).filter(Boolean)
        if (followedIds.length === 0) {
          setMusicians([])
          return
        }

        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, photo_url, bio')
          .in('id', followedIds)
          .eq('user_type', 'musician')

        if (profilesError) {
          console.error('Followed musician profile error:', profilesError)
          setMusicians([])
          return
        }

        setMusicians((profiles || []) as MusicianProfile[])
      } finally {
        setLoading(false)
      }
    }

    loadFollowing()
  }, [])

  const unfollow = async (musicianId: string) => {
    if (!userId) return
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('fan_id', userId)
      .eq('musician_id', musicianId)

    if (error) {
      console.error('Unfollow error:', error)
      return
    }

    setMusicians(prev => prev.filter((musician) => musician.id !== musicianId))
  }

  return (
    <main style={{ minHeight: '100vh', background: '#1A1410', color: '#F5F0E8', padding: '32px 20px' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
        <a href="/dashboard" style={{ color: '#D4820A', textDecoration: 'none', fontFamily: "'Playfair Display', serif", fontSize: '1.5rem' }}>
          HouseShow
        </a>
        <h1 style={{ marginTop: '14px', marginBottom: '18px', fontFamily: "'Playfair Display', serif", fontSize: '2.2rem' }}>
          Artists You Follow
        </h1>

        {loading ? (
          <p style={{ color: '#8C7B6B' }}>Loading followed artists...</p>
        ) : musicians.length === 0 ? (
          <p style={{ color: '#8C7B6B' }}>You are not following any artists yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: '14px' }}>
            {musicians.map((musician) => (
              <article
                key={musician.id}
                style={{
                  border: '1px solid rgba(212,130,10,0.2)',
                  borderRadius: '12px',
                  padding: '16px',
                  background: 'rgba(44,34,24,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img
                    src={musician.photo_url || 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=160&q=60'}
                    alt={musician.name || 'Musician'}
                    style={{ width: '48px', height: '48px', borderRadius: '999px', objectFit: 'cover' }}
                  />
                  <div>
                    <h2 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: '1.2rem' }}>
                      {musician.name || 'Musician'}
                    </h2>
                    {musician.bio ? (
                      <p style={{ margin: '4px 0 0', color: '#8C7B6B', fontSize: '0.85rem' }}>{musician.bio}</p>
                    ) : null}
                  </div>
                </div>
                <button
                  onClick={() => unfollow(musician.id)}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(212,130,10,0.35)',
                    borderRadius: '8px',
                    color: '#F5F0E8',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Unfollow
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
