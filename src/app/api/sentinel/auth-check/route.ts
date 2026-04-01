export async function POST(req: Request) {
  const { password } = await req.json()
  if (password !== process.env.SENTINEL_PASSWORD) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return Response.json({ ok: true })
}
