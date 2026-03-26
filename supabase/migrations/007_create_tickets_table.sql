create extension if not exists "pgcrypto";

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.shows(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  checked_in boolean not null default false
);

create index if not exists tickets_user_id_idx on public.tickets(user_id);
create index if not exists tickets_show_id_idx on public.tickets(show_id);

alter table public.tickets enable row level security;

create policy "Users can view their own tickets"
  on public.tickets
  for select
  to authenticated
  using (auth.uid() = user_id);
