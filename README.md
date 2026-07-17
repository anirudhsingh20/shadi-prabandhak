# Shadi Prabandhak

Wedding management app for **Anjali** & **Anirudh** — wedding date **20 November 2026**.

Built with **Vite + React + shadcn/ui + Supabase**.

## Features

- Live countdown to wedding day
- **Events** — Mehendi, Haldi, Sangeet, Wedding, Reception
- **Guests** — RSVP tracking, filters, mobile-friendly cards
- **Budget** — category spend with progress bars
- **Vendors** — contacts and booking status
- **Checklist** — grouped timeline with status toggles
- **Decision log** — planning notes on home page
- **Auth** — password + magic link, restricted to allowed emails

## Quick start

### 1. Supabase setup

1. Create a free project at [supabase.com](https://supabase.com)
2. In **SQL Editor**, run [`supabase/schema.sql`](supabase/schema.sql) then [`supabase/seed.sql`](supabase/seed.sql)
3. In **Authentication → Providers**, enable Email
4. Add redirect URL: `http://localhost:5173/auth/callback` (and your production URL later)
5. Create user accounts in **Authentication → Users** (or sign up via magic link)

### 2. Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ALLOWED_EMAILS=anjali@example.com,anirudh@example.com
```

Only emails in `VITE_ALLOWED_EMAILS` can sign in.

### 3. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Project structure

```
src/
├── pages/          # Route pages with CRUD
├── components/     # UI + layout
├── hooks/          # Auth provider
├── lib/            # Supabase client, validations, types
supabase/
├── schema.sql      # Tables + RLS
└── seed.sql        # Starter data
legacy/             # Original static HTML prototype
```

## Forms

Every add/edit dialog uses **react-hook-form + Zod** validation and an explicit **Submit** button. Data is saved directly to Supabase.

## Deploy

- **Frontend:** Vercel, Netlify, or any static host (`npm run build`)
- **Backend:** Supabase (already hosted)
- Add production URL to Supabase redirect URLs and update `.env` on host

---

Made with love for Anjali & Anirudh
