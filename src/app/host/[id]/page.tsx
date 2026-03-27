import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

export default async function HostProfilePage({ params }: { params: { id: string } }) {
  
  const { data: host } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!host) return notFound()

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: 'white', padding: '2rem' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        {host.photo_url && (
          <img src={host.photo_url} alt={host.name} style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', marginBottom: '1rem' }} />
        )}
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#c9a84c' }}>{host.name}</h1>
        {host.bio && <p style={{ color: '#aaa', marginTop: '0.5rem' }}>{host.bio}</p>}
        {host.location_address && <p style={{ color: '#888', marginTop: '0.5rem' }}>📍 {host.location_address}</p>}
        <Link href={`/book-show?host_id=${params.id}`}>
          <button style={{ marginTop: '2rem', backgroundColor: '#c9a84c', color: 'black', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
            Request to Book
          </button>
        </Link>
      </div>
    </div>
  )
}
