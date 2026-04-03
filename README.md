# snkrfeature

Production-focused MVP for a sneaker feature intelligence platform built with **Next.js App Router + TypeScript + Tailwind + Supabase + OpenAI + Cloudflare Turnstile**.

## What is included

- Homepage sneaker database table (`/`) with sticky header, search, brand filter, compare selection, quick stats.
- Sneaker detail page (`/shoes/[slug]`) with spec cards, story section, tags, related shoes, and discussion form.
- Compare matrix (`/compare`) with sticky top row/left column, highlight-differences mode, and in-page search-to-add workflow.
- Auth UI (`/login`, `/register`) with username-first UX and Turnstile integration point.
- Dashboard shell (`/dashboard`) for profile/comment/submission center.
- User submission flow (`/submit`) with Turnstile + OpenAI server-side normalization pipeline.
- Production admin workspace (`/admin`) with separate admin login (`/admin/login`), moderation queue, published-record editing, and audit trail.
- Supabase schema migration and seed SQL under `db/`.
- Demo mode fallback when Supabase/OpenAI/Turnstile vars are missing.

## Local run steps (exact)

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy environment file:
   ```bash
   cp .env.example .env.local
   ```
3. Fill required env vars in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY` (optional for demo mode)
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (optional for demo mode)
   - `TURNSTILE_SECRET_KEY` (optional for demo mode)
4. Start development server:
   ```bash
   npm run dev
   ```
5. Optional quality checks:
   ```bash
   npm run lint
   npm run typecheck
   npm run build
   ```

## Supabase setup steps (exact)

1. Create a Supabase project.
2. In SQL editor, run migrations in order:
   - `db/migrations/001_init.sql`
   - `db/migrations/002_profiles_rls.sql`
   - `db/migrations/003_comment_votes_admin.sql`
   - `db/migrations/004_profiles_public_read_comments.sql`
   - `db/migrations/005_admin_system.sql`
   - `db/migrations/006_remove_admin_sessions.sql`
3. Run `db/seed.sql` for demo rows.
4. In **Auth > Providers**, enable Email provider.
5. Add project URL + anon key to `.env.local`.
6. Set at least one profile to `role='admin'` for admin workspace access.
7. Confirm RLS policies from migrations are active.

## Vercel deployment steps (exact)

1. Push this repo to GitHub.
2. In Vercel, import the repo.
3. Framework preset: **Next.js**.
4. Add environment variables in Vercel Project Settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
   - `TURNSTILE_SECRET_KEY`
5. Deploy.
6. After deploy, verify:
   - `/` loads seeded data or fallback demo data.
   - `/submit` accepts submission and returns normalization response.
   - `/compare?ids=1,2` works.

## Architecture notes

- `lib/openai-normalize.ts` is server-only normalization entrypoint.
- `lib/turnstile.ts` centralizes token verification.
- `lib/data/shoes.ts` handles Supabase-first + demo fallback reads.
- Database model is future-ready for crawler ingestion via `user_submissions.raw_payload` and normalization queue.

## Demo mode behavior

If Supabase or OpenAI credentials are missing:
- App still renders with local demo shoe data.
- Submission API still accepts payload and returns clear fallback processing note.
- Turnstile verification automatically passes in demo mode.

