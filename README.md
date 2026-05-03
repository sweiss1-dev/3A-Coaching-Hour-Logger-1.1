# 3A Coaching — Hour Logger

Web app for staff to log hours by clicking a date on a calendar and entering start/end times. Every 15 days, a `.txt` report of everyone's hours is automatically emailed to **threeacoaching@gmail.com**.

**Stack:** React + Vite + TypeScript + Tailwind · Supabase (auth + Postgres + cron + Edge Functions) · Resend (email).

---

## Quick start (local)

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase URL + anon key
npm run dev
```

You'll need to complete the **Setup** below first to have a working backend.

---

## Setup (one-time, ~15 minutes)

### 1. Create a Supabase project
1. Sign up at [supabase.com](https://supabase.com), create a new project (free tier is fine).
2. Wait for it to provision.
3. **Project Settings → API** — copy:
   - **Project URL** → goes in `.env.local` as `VITE_SUPABASE_URL`
   - **anon public key** → goes in `.env.local` as `VITE_SUPABASE_ANON_KEY`
   - **service_role secret** → keep it safe; you'll paste it into Edge Function secrets and the cron job below.

### 2. Run the database migration
1. Open **SQL Editor → New query**.
2. Paste the entire contents of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
3. Click **Run**. This creates the `profiles` and `hours` tables, RLS policies (so users only see their own hours), and a trigger that auto-creates a profile when someone signs up.

### 3. Sign up for Resend
1. Sign up at [resend.com](https://resend.com).
2. **API Keys → Create API Key** — copy it.
3. For the "from" address you can use `onboarding@resend.dev` for testing, or verify your own domain in **Domains** for a more professional look.

### 4. Deploy the Edge Function
Install the Supabase CLI: <https://supabase.com/docs/guides/cli>

```bash
supabase login
supabase link --project-ref YOUR-PROJECT-REF        # find ref in Supabase URL
supabase functions deploy send-biweekly-report
```

Set the Edge Function secrets:

```bash
supabase secrets set \
  RESEND_API_KEY=re_xxxxxxxxxxxxxxxx \
  REPORT_TO_EMAIL=threeacoaching@gmail.com \
  REPORT_FROM_EMAIL="Hour Logger <onboarding@resend.dev>" \
  PERIOD_DAYS=15
```

Test it manually:

```bash
curl -X POST "https://YOUR-PROJECT-REF.supabase.co/functions/v1/send-biweekly-report" \
  -H "Authorization: Bearer YOUR-SERVICE-ROLE-KEY"
```

You should get a `{ "ok": true, ... }` response and an email at threeacoaching@gmail.com.

### 5. Schedule it every 15 days
1. Open **SQL Editor → New query**.
2. Open [`supabase/schedule.sql`](supabase/schedule.sql), replace `YOUR-PROJECT-REF` and `YOUR-SERVICE-ROLE-KEY`, paste & run.
3. This fires the function on the **1st** and **16th** of every month at 09:00 UTC (closest reliable "every 15 days" — true 15-day intervals drift across month boundaries).

To verify it's scheduled:

```sql
select * from cron.job;
```

### 6. Disable email confirmation (optional but recommended for a small team)
By default Supabase requires email verification before sign-in. To skip that:
**Authentication → Providers → Email** → turn off **Confirm email**.

### 7. Deploy the frontend
The simplest option is **Vercel**:

1. Push this repo to GitHub.
2. Go to [vercel.com](https://vercel.com), import the repo.
3. Add environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Deploy. Share the URL with your team.

---

## How it works

- **Sign-up / sign-in:** Supabase Auth (email + password). On sign-up, a trigger creates a row in `profiles` with the user's full name and email.
- **Logging hours:** The user picks a date on the calendar, enters start/end times, and the entry is inserted into `hours`. Row Level Security ensures each user can only read/write their own entries.
- **Bi-weekly email:** A `pg_cron` job calls the `send-biweekly-report` Edge Function. The function uses the service-role key (bypassing RLS) to read every user's hours from the last 15 days, joins on `profiles` for names, formats a `.txt` file grouped by user, and sends it via Resend as an attachment.

## Report format example

```
3A Coaching — Hours Report
Period: 2026-04-12 to 2026-04-27
Generated: 2026-04-27T09:00:00.000Z

=== Jane Smith ===
Email: jane@3acoaching.com
  2026-04-13   09:00 - 17:00   8.00 hours
  2026-04-14   10:00 - 14:30   4.50 hours
Total: 12.50 hours

=== John Doe ===
Email: john@3acoaching.com
  2026-04-15   08:00 - 16:00   8.00 hours
Total: 8.00 hours

---
Grand total: 20.50 hours across 2 user(s)
```

## File map

```
src/
  App.tsx                    Auth gate → Auth or Dashboard
  lib/supabase.ts            Supabase client + types
  components/
    Auth.tsx                 Sign in / sign up screen
    Dashboard.tsx            Logged-in shell, loads entries
    Calendar.tsx             Month-view calendar
    HourEntryForm.tsx        Start/end time form for selected day
    EntriesList.tsx          Recent entries with delete

supabase/
  migrations/0001_init.sql   Tables + RLS + sign-up trigger
  schedule.sql               pg_cron schedule for the bi-weekly email
  functions/
    send-biweekly-report/
      index.ts               Edge Function: build .txt + email via Resend
```

## Common tweaks

- **Change the recipient:** edit the `REPORT_TO_EMAIL` Edge Function secret.
- **Change the period length:** edit `PERIOD_DAYS` secret (default 15) AND adjust the cron schedule in `schedule.sql` accordingly.
- **Make it admin-approved sign-up later:** in Supabase Auth, turn email confirmation back on, or add a `role` column to `profiles` and gate the Dashboard on it.
