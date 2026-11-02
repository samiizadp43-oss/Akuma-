create extension if not exists "pgcrypto";

create table if not exists public.works (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  cover_url text,
  type text,
  status text default 'ongoing',
  genres text[] default '{}',
  created_at timestamptz default now()
);

create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  work_id uuid references public.works(id) on delete cascade,
  title text not null,
  chapter_number numeric,
  pages text[] default '{}',
  created_at timestamptz default now()
);

create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  work_id uuid references public.works(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, work_id)
);

alter table public.works enable row level security;
alter table public.chapters enable row level security;
alter table public.bookmarks enable row level security;

create policy "Public can read works"
on public.works for select
using (true);

create policy "Public can read chapters"
on public.chapters for select
using (true);

create policy "Users can manage own bookmarks"
on public.bookmarks for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
