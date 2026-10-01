# KCC Ground Admin

Private operations portal for KCC Cricket Ground. The app manages bookings, blocked dates, clients, payments, tournaments, and maintenance.

## Security and storage

- Supabase email/password authentication with cookie-based server sessions
- Access restricted to `kingsclubcricket@gmail.com`
- PostgreSQL storage protected by row-level security
- No password or private database key is committed to GitHub
- Unauthenticated visitors are redirected to the login page

## Setup

1. Create a Supabase project and disable public sign-ups.
2. Create the single authorized user: `kingsclubcricket@gmail.com`.
3. Run `supabase/migrations/001_kcc_schema.sql`, followed by `supabase/seed.sql`. Existing projects should also run `supabase/migrations/002_update_admin_email.sql`.
4. Copy `.env.example` to `.env.local` and add the project URL and publishable key. The authorized email is defined in `lib/auth-config.ts`.
5. Install dependencies and run `pnpm dev`.

Production secrets must be configured in the deployment platform, never in this repository.
