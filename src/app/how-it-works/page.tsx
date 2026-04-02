export default function HowItWorks() {
  const sections = [
    {
      emoji: '🎸',
      title: 'For Musicians',
      subtitle: 'Play real rooms. Build real fans.',
      items: [
        { heading: 'What you do', text: 'Create your profile with Spotify, YouTube, or SoundCloud links. Browse the venue radar to find hosts within 100 miles, then send a booking request with your proposed date and ticket price.' },
        { heading: 'What you get', text: 'A dedicated ticket page for every show, automatic Stripe payouts, and a direct relationship with your audience. No middlemen, no bookers, no pay-to-play.' },
        { heading: 'Why it\'s worth it', text: 'House shows convert listeners into lifelong fans. Intimate rooms mean real connections, merch sales, and a fanbase that actually shows up next time. You keep the majority of every ticket sold.' },
      ],
    },
    {
      emoji: '🏠',
      title: 'For Hosts',
      subtitle: 'Turn your space into a venue.',
      items: [
        { heading: 'What you do', text: 'List your space with photos, capacity, and neighborhood. Musicians will find you on the venue radar and send booking requests. You approve the ones you like and set the terms.' },
        { heading: 'What you get', text: 'A cut of every ticket sold, a curated cultural experience in your own home, and zero upfront cost. HouseShow handles ticketing, payments, and splits automatically.' },
        { heading: 'Why it\'s worth it', text: 'You become part of the live music ecosystem without the overhead of running a venue. Great hosts build reputations and get repeat requests from top artists.' },
      ],
    },
    {
      emoji: '🎟️',
      title: 'For Fans',
      subtitle: 'Discover shows you can\'t find anywhere else.',
      items: [
        { heading: 'What you do', text: 'Browse upcoming house shows by neighborhood or artist. Buy tickets directly through HouseShow. Show up, enjoy the music, and discover your next favorite artist.' },
        { heading: 'What you get', text: 'Access to intimate, one-of-a-kind concerts in living rooms, backyards, and lofts. Small crowds, great sound, and artists who remember your face.' },
        { heading: 'Why it\'s worth it', text: 'These shows sell out fast and never happen twice. Every ticket supports independent artists and the people who open their doors to live music.' },
      ],
    },
  ]

  return (
    <main style={{ minHeight: '100vh', background: '#1A1410' }}>
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '24px 48px', borderBottom: '1px solid rgba(212,130,10,0.15)',
      }}>
        <a href="/" style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.6rem', fontWeight: 700, color: '#F0A500', textDecoration: 'none' }}>
          HouseShow
        </a>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <a href="/shows" style={{ color: '#8C7B6B', fontSize: '0.9rem', textDecoration: 'none' }}>Shows</a>
          <a href="/auth/login" style={{
            border: '1px solid rgba(240,165,0,0.4)', color: '#F0A500',
            padding: '8px 20px', borderRadius: '4px', fontSize: '0.85rem', textDecoration: 'none',
          }}>Sign In</a>
        </div>
      </nav>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '80px 32px' }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', color: '#D4820A', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '16px', textAlign: 'center' }}>
          The Platform
        </div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.8rem', fontWeight: 700, color: '#F5F0E8', textAlign: 'center', marginBottom: '16px' }}>
          How HouseShow Works
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '1.05rem', color: '#8C7B6B', textAlign: 'center', lineHeight: 1.7, marginBottom: '80px', maxWidth: '560px', marginLeft: 'auto', marginRight: 'auto' }}>
          HouseShow connects musicians, hosts, and fans to make intimate live music happen. Here&apos;s how each role works.
        </p>

        {sections.map((section, i) => (
          <section key={section.title} style={{ marginBottom: i < sections.length - 1 ? '72px' : '0' }}>
            <div style={{
              border: '1px solid rgba(212,130,10,0.2)',
              borderRadius: '16px',
              padding: '40px',
              background: 'rgba(44,34,24,0.3)',
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>{section.emoji}</div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', color: '#F5F0E8', marginBottom: '4px' }}>
                {section.title}
              </h2>
              <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#D4820A', fontSize: '0.95rem', marginBottom: '28px' }}>
                {section.subtitle}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {section.items.map((item) => (
                  <div key={item.heading}>
                    <h3 style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', color: '#F0A500', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>
                      {item.heading}
                    </h3>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.95rem', color: '#8C7B6B', lineHeight: 1.7 }}>
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}

        <div style={{ textAlign: 'center', marginTop: '80px', paddingBottom: '40px' }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', color: '#D4820A', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '16px' }}>
            Ready?
          </div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: '#F5F0E8', marginBottom: '24px' }}>
            Join the house show movement
          </h2>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/auth/register?role=musician" style={{
              background: 'linear-gradient(135deg, #D4820A, #F0A500)', color: '#1A1410',
              padding: '14px 28px', borderRadius: '4px', fontSize: '0.95rem', fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif", textDecoration: 'none',
            }}>
              Sign Up as Musician
            </a>
            <a href="/auth/register?role=host" style={{
              border: '1px solid rgba(240,165,0,0.4)', color: '#F0A500',
              padding: '14px 28px', borderRadius: '4px', fontSize: '0.95rem', fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif", textDecoration: 'none',
            }}>
              Sign Up as Host
            </a>
            <a href="/auth/register?role=fan" style={{
              border: '1px solid rgba(140,123,107,0.3)', color: '#8C7B6B',
              padding: '14px 28px', borderRadius: '4px', fontSize: '0.95rem', fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif", textDecoration: 'none',
            }}>
              Sign Up as Fan
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
