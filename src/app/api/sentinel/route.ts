export async function POST(req: Request) {
  const body = await req.json()
  const { prompt, password } = body

  if (password !== process.env.SENTINEL_PASSWORD) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'Anthropic API key not configured' }, { status: 500 })
  }

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!anthropicRes.ok) {
    const err = await anthropicRes.text()
    console.error('Anthropic API error:', err)
    return Response.json({ error: 'Upstream API error' }, { status: 502 })
  }

  const data = await anthropicRes.json()
  const text = data.content?.[0]?.text ?? ''

  return Response.json({ response: text })
}
