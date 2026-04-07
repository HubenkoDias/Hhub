# HHub — Deployment Guide

## Stack
Next.js 15 · React 19 · Supabase · Tailwind CSS · Vercel (free)

---

## Step 1 — Supabase (5 min)
1. supabase.com → New project
2. SQL Editor → paste `supabase-schema.sql` → Run
3. Storage → create 5 buckets:

| Bucket         | Public | Max size |
|----------------|--------|----------|
| avatars        | ✅     | 5 MB     |
| certificates   | ✅     | 5 MB     |
| company-logos  | ✅     | 2 MB     |
| chat-files     | ❌     | 5 MB     |
| blog-covers    | ✅     | 5 MB     |

4. Settings → API → copy Project URL, anon key, service_role key

---

## Step 2 — Deploy to Vercel (5 min)
1. Push project to GitHub
2. vercel.com → Import → select repo
3. Add env vars:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
4. Deploy

---

## Step 3 — Become admin
After registering on the site:
Supabase → Table Editor → profiles → change your `role` to `admin`
Then access /admin

---

## Local dev
```bash
cp .env.example .env.local
# fill in values
npm install
npm run dev
# → http://localhost:3000
```
