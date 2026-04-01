import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  })

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'Anthropic API key not configured' }, { status: 500 })
  }

  const body = await req.json()
  const { artistName, artistBio, venueName, neighborhood, date, time, ticketPrice, ticketUrl } = body

  const formattedDate = date
    ? new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : date

  const formattedTime = time
    ? new Date('1970-01-01T' + time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    : time

  const prompt = `You are writing promotional copy for a house concert — an intimate live music show held in someone's home.

Show details:
- Artist: ${artistName || 'TBD'}
${artistBio ? `- Artist bio: ${artistBio}` : ''}
- Venue: ${venueName || 'Private residence'}
- Neighborhood/area: ${neighborhood || 'Local area'}
- Date: ${formattedDate || date}
- Time: ${formattedTime || time}
- Ticket price: $${ticketPrice}
${ticketUrl ? `- Tickets: ${ticketUrl}` : ''}

Generate Facebook event promotional copy. Respond with ONLY valid JSON in this exact structure:
{
  "eventTitle": "A compelling event title (max 60 chars)",
  "eventDescription": "A warm, inviting Facebook event description. 2-3 paragraphs. Include the intimate atmosphere, artist, date/time, ticket price. End with a call to action. Plain text, no markdown.",
  "hostCaption": "A short, excited Instagram/Facebook caption the HOST would post to invite their friends. 2-4 sentences. Include key details. End with a ticket link placeholder [TICKET_LINK].",
  "artistCaption": "A short, personal caption the ARTIST would post about the upcoming show. 2-4 sentences. Warm and genuine tone. End with a ticket link placeholder [TICKET_LINK].",
  "coverPhotoText": "Text overlay for the Facebook event cover photo. Just the essential details on 3-4 lines. Format: artist name, show name or descriptor, date, venue area."
}`

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!anthropicRes.ok) {
    const err = await anthropicRes.text()
    console.error('Anthropic API error:', err)
    return Response.json({ error: 'Failed to generate content' }, { status: 502 })
  }

  const data = await anthropicRes.json()
  const text = data.content?.[0]?.text ?? ''

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in response')
    const parsed = JSON.parse(jsonMatch[0])
    return Response.json(parsed)
  } catch {
    console.error('Failed to parse AI response:', text)
    return Response.json({ error: 'Failed to parse generated content' }, { status: 500 })
  }
}
