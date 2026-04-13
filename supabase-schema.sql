-- =============================================================
-- BlakeHub Supabase Schema
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- =============================================================

-- 1. Websites table
create table if not exists public.websites (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text not null,
  url text not null,
  created_at timestamptz default now()
);

-- 2. Guides table
create table if not exists public.guides (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  slug text not null unique,
  content text not null default '',
  icon text default 'default',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Course notes table
create table if not exists public.course_notes (
  id uuid default gen_random_uuid() primary key,
  course_code text not null unique,
  notes text not null default '',
  updated_at timestamptz default now()
);

-- =============================================================
-- Row Level Security (RLS) Policies
-- Everyone can READ, only authenticated users can WRITE
-- =============================================================

-- Enable RLS on all tables
alter table public.websites enable row level security;
alter table public.guides enable row level security;
alter table public.course_notes enable row level security;

-- Websites policies
create policy "Anyone can view websites" on public.websites
  for select using (true);

create policy "Authenticated users can insert websites" on public.websites
  for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can update websites" on public.websites
  for update using (auth.role() = 'authenticated');

create policy "Authenticated users can delete websites" on public.websites
  for delete using (auth.role() = 'authenticated');

-- Guides policies
create policy "Anyone can view guides" on public.guides
  for select using (true);

create policy "Authenticated users can insert guides" on public.guides
  for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can update guides" on public.guides
  for update using (auth.role() = 'authenticated');

create policy "Authenticated users can delete guides" on public.guides
  for delete using (auth.role() = 'authenticated');

-- Course notes policies
create policy "Anyone can view course notes" on public.course_notes
  for select using (true);

create policy "Authenticated users can insert course notes" on public.course_notes
  for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can update course notes" on public.course_notes
  for update using (auth.role() = 'authenticated');

create policy "Authenticated users can delete course notes" on public.course_notes
  for delete using (auth.role() = 'authenticated');
