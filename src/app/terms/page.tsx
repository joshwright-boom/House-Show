export default function TermsPage() {
  const sections = [
    {
      title: 'What HouseShow Is',
      body: 'HouseShow is a marketplace platform that connects independent musicians, venue hosts, and fans. HouseShow does not employ musicians, own venues, or produce events. We are a technology platform only.',
    },
    {
      title: 'You Are Responsible for Your Event',
      body: 'Hosts are solely responsible for ensuring their venue is legally permitted to hold events, complies with local noise ordinances, occupancy limits, fire codes, and any applicable licensing requirements (including music licensing where required). HouseShow bears no responsibility for code violations, neighbor complaints, or permit issues.',
    },
    {
      title: 'Assumption of Risk',
      body: 'By attending, hosting, or performing at a HouseShow event, all parties acknowledge that live events carry inherent risks including but not limited to personal injury, property damage, and theft. All parties voluntarily assume these risks.',
    },
    {
      title: 'No Guarantee of Payment',
      body: 'While HouseShow facilitates payments through Stripe, we are not liable for payment disputes between musicians and hosts, chargebacks, or failure of payment processors. Disputes between users must be resolved between the parties.',
    },
    {
      title: 'Behavior at Events',
      body: 'All users agree to conduct themselves lawfully at all events. HouseShow reserves the right to remove any user from the platform for reported misconduct, illegal activity, harassment, or violation of these terms.',
    },
    {
      title: 'Alcohol & Controlled Substances',
      body: 'Hosts are solely responsible for compliance with all laws regarding alcohol service at their venue. HouseShow does not authorize, condone, or take responsibility for alcohol service at any event listed on our platform.',
    },
    {
      title: 'Minors',
      body: 'Hosts must ensure their events comply with all applicable laws regarding minors in attendance. HouseShow is not responsible for age verification at events.',
    },
    {
      title: 'Intellectual Property',
      body: 'Musicians retain all rights to their original music. By listing on HouseShow, musicians grant HouseShow a limited license to display their name, bio, and music links for promotional purposes on the platform.',
    },
    {
      title: 'Limitation of Liability',
      body: 'To the fullest extent permitted by law, HouseShow, its founders, employees, and contractors shall not be liable for any indirect, incidental, or consequential damages arising from use of the platform or attendance at any event facilitated through it.',
    },
    {
      title: 'Changes to These Terms',
      body: 'We reserve the right to update these terms at any time. Continued use of the platform constitutes acceptance of the revised terms.',
    },
    {
      title: 'Governing Law',
      body: 'These terms are governed by the laws of the State of Oklahoma.',
    },
  ]

  return (
    <main style={{ minHeight: '100vh', background: '#1A1410', color: '#F5F0E8', padding: '40px 20px' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
        <a
          href="/"
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '1.4rem',
            color: '#F0A500',
            textDecoration: 'none',
            display: 'inline-block',
            marginBottom: '22px'
          }}
        >
          HouseShow
        </a>

        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.6rem', marginBottom: '10px' }}>
            Terms of Service
          </h1>
          <p style={{ color: '#8C7B6B', fontSize: '0.9rem' }}>
            Last updated: March 2026 — This document is a placeholder pending legal review.
          </p>
        </div>

        <section
          style={{
            border: '1px solid rgba(212,130,10,0.2)',
            borderRadius: '12px',
            background: 'rgba(44,34,24,0.35)',
            padding: '24px'
          }}
        >
          {sections.map((section, index) => (
            <article key={section.title} style={{ marginBottom: index === sections.length - 1 ? 0 : '24px' }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.35rem', color: '#F0A500', marginBottom: '8px' }}>
                {index + 1}. {section.title}
              </h2>
              <p style={{ color: '#F5F0E8', lineHeight: 1.7, fontSize: '0.98rem' }}>{section.body}</p>
            </article>
          ))}

          <article style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(212,130,10,0.18)' }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.35rem', color: '#F0A500', marginBottom: '8px' }}>
              Contact
            </h2>
            <p style={{ color: '#F5F0E8', lineHeight: 1.7, fontSize: '0.98rem' }}>
              legal@houseshow.net
            </p>
          </article>
        </section>
      </div>
    </main>
  )
}
