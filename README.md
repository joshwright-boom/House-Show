# HouseShow

Live music booking marketplace — Airbnb for house shows.

## Setup (2 minutes)

1. Open this folder in Cursor
2. Open the terminal (⌘J)
3. Run: `npm install`
4. Run: `npm run dev`
5. Open browser to: http://localhost:3000

## Supabase Keys

Your `.env.local` file already has the URL and anon key filled in.
You still need to add your service_role key:
- Go to supabase.com → your project → Settings → API Keys → Legacy tab
- Copy the service_role key
- Open `.env.local` and replace `your_service_role_key_here`

## Email (Resend)

Ticket confirmation emails require:
- `RESEND_API_KEY` (from resend.com)
- `RESEND_FROM_EMAIL` (a verified sender, e.g. `tickets@yourdomain.com`)

## Pages

- `/` — Homepage
- `/auth/login` — Sign in (connected to Supabase)
- `/auth/register` — Sign up (connected to Supabase)
- `/dashboard` — User dashboard (protected, redirects if not logged in)
