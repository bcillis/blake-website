# BlakeHub Setup Guide

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up / sign in
2. Click **New Project**
3. Give it a name (e.g. "blake-hub"), set a database password, choose a region
4. Wait for it to finish provisioning (~1 minute)

## 2. Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Copy and paste the entire contents of `supabase-schema.sql` into the editor
4. Click **Run** — you should see "Success. No rows returned"

## 3. Create Your Login Account

1. In Supabase dashboard, go to **Authentication** (left sidebar)
2. Click **Add User** > **Create new user**
3. Enter your email and a password — this will be your login for the site
4. Click **Create User**

## 4. Get Your API Keys

1. In Supabase dashboard, go to **Settings** > **API** (or Project Settings > API)
2. Copy the **Project URL** (looks like `https://xxxxx.supabase.co`)
3. Copy the **anon / public** key (the long string under "Project API keys")

## 5. Set Up the Project Locally

```bash
# Install dependencies
npm install

# Create your environment file
cp .env.local.example .env.local
```

Edit `.env.local` and paste in your Supabase URL and anon key:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## 6. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — your site should be running!

## 7. Deploy to Vercel

1. Push this project to a GitHub repository
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub
3. Click **Add New** > **Project**
4. Import your GitHub repo
5. In the **Environment Variables** section, add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
6. Click **Deploy**

Your site will be live at `your-project-name.vercel.app`!

## Quick Reference

- **Add websites**: Sign in → go to Websites → click "Add Website"
- **Edit journey notes**: Sign in → go to Journey → click "+ Add note" on any course
- **Create guides**: Sign in → go to Guides → click "New Guide"
- **Edit guides**: Sign in → open a guide → click "Edit" → write in Markdown → Save
