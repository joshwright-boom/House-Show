import { createClient } from '@supabase/supabase-js'
import { notFound, redirect } from 'next/navigation'

export default async function ShowsIdPage({ params }: { params: { id: string } }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    notFound()
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const { data, error } = await supabase
    .from('shows')
    .select('id')
    .or(`id.eq.${params.id},slug.eq.${params.id}`)
    .maybeSingle()

  if (error || !data) {
    notFound()
  }

  redirect(`/show/${data.id}`)
}
