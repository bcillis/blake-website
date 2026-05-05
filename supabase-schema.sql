-- =============================================================
-- BlakeHub Supabase Schema
-- Safe to re-run: tables use `create if not exists`, policies
-- are dropped first via `drop policy if exists`.
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor).
-- =============================================================

-- 1. Websites table
create table if not exists public.websites (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text not null,
  url text not null,
  user_id uuid references auth.users(id),
  created_at timestamptz default now()
);

-- 2. Guides table
create table if not exists public.guides (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  slug text not null unique,
  content text not null default '',
  icon text default 'default',
  user_id uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Course notes table (with description and file support)
create table if not exists public.course_notes (
  id uuid default gen_random_uuid() primary key,
  course_code text not null unique,
  notes text not null default '',
  description text not null default '',
  file_url text,
  file_name text,
  user_id uuid references auth.users(id),
  updated_at timestamptz default now()
);

-- 4. Wishlist table
create table if not exists public.wishlist (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  price numeric(10, 2) not null default 0,
  link text not null,
  user_id uuid references auth.users(id),
  created_at timestamptz default now()
);

-- =============================================================
-- Row Level Security (RLS) Policies
-- Everyone can READ, only the owner can WRITE
-- =============================================================

-- Enable RLS on all tables (no-op if already enabled)
alter table public.websites      enable row level security;
alter table public.guides        enable row level security;
alter table public.course_notes  enable row level security;
alter table public.wishlist      enable row level security;

-- Websites policies
drop policy if exists "Anyone can view websites"                  on public.websites;
drop policy if exists "Authenticated users can insert websites"   on public.websites;
drop policy if exists "Owners can update their websites"          on public.websites;
drop policy if exists "Owners can delete their websites"          on public.websites;

create policy "Anyone can view websites" on public.websites
  for select using (true);
create policy "Authenticated users can insert websites" on public.websites
  for insert with check (auth.uid() = user_id);
create policy "Owners can update their websites" on public.websites
  for update using (auth.uid() = user_id);
create policy "Owners can delete their websites" on public.websites
  for delete using (auth.uid() = user_id);

-- Guides policies
drop policy if exists "Anyone can view guides"                    on public.guides;
drop policy if exists "Authenticated users can insert guides"     on public.guides;
drop policy if exists "Owners can update their guides"            on public.guides;
drop policy if exists "Owners can delete their guides"            on public.guides;

create policy "Anyone can view guides" on public.guides
  for select using (true);
create policy "Authenticated users can insert guides" on public.guides
  for insert with check (auth.uid() = user_id);
create policy "Owners can update their guides" on public.guides
  for update using (auth.uid() = user_id);
create policy "Owners can delete their guides" on public.guides
  for delete using (auth.uid() = user_id);

-- Course notes policies
drop policy if exists "Anyone can view course notes"              on public.course_notes;
drop policy if exists "Authenticated users can insert course notes" on public.course_notes;
drop policy if exists "Owners can update their course notes"      on public.course_notes;
drop policy if exists "Owners can delete their course notes"      on public.course_notes;

create policy "Anyone can view course notes" on public.course_notes
  for select using (true);
create policy "Authenticated users can insert course notes" on public.course_notes
  for insert with check (auth.uid() = user_id);
create policy "Owners can update their course notes" on public.course_notes
  for update using (auth.uid() = user_id);
create policy "Owners can delete their course notes" on public.course_notes
  for delete using (auth.uid() = user_id);

-- Wishlist policies
drop policy if exists "Anyone can view wishlist"                  on public.wishlist;
drop policy if exists "Authenticated users can insert wishlist"   on public.wishlist;
drop policy if exists "Owners can update their wishlist"          on public.wishlist;
drop policy if exists "Owners can delete their wishlist"          on public.wishlist;

create policy "Anyone can view wishlist" on public.wishlist
  for select using (true);
create policy "Authenticated users can insert wishlist" on public.wishlist
  for insert with check (auth.uid() = user_id);
create policy "Owners can update their wishlist" on public.wishlist
  for update using (auth.uid() = user_id);
create policy "Owners can delete their wishlist" on public.wishlist
  for delete using (auth.uid() = user_id);

-- =============================================================
-- Storage bucket for course files (PDFs, docs, etc.)
-- =============================================================

insert into storage.buckets (id, name, public)
values ('course-files', 'course-files', true)
on conflict (id) do nothing;

-- Storage policies
drop policy if exists "Anyone can view course files"                       on storage.objects;
drop policy if exists "Authenticated users can upload course files"        on storage.objects;
drop policy if exists "Authenticated users can update course files"        on storage.objects;
drop policy if exists "Authenticated users can delete course files"        on storage.objects;

create policy "Anyone can view course files" on storage.objects
  for select using (bucket_id = 'course-files');
create policy "Authenticated users can upload course files" on storage.objects
  for insert with check (bucket_id = 'course-files' and auth.role() = 'authenticated');
create policy "Authenticated users can update course files" on storage.objects
  for update using (bucket_id = 'course-files' and auth.role() = 'authenticated');
create policy "Authenticated users can delete course files" on storage.objects
  for delete using (bucket_id = 'course-files' and auth.role() = 'authenticated');
