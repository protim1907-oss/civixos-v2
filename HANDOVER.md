# Civix250 — Source Code Handover & Run Guide

**Prepared for:** Costa Brown (Eboriko Support LLC)
**Prepared by:** Protim Ghosh (BidsPro International)
**Project:** Civix250.ai — AI-powered civic engagement platform
**Last updated:** _(fill in on handover date)_

This document explains everything needed to run, build, and deploy the Civix250
source code: environments, SDKs, accounts, environment variables, the database,
and the deployment setup. Read the **Handover checklist** (bottom) last — it lists
the accounts and secrets that must be transferred and rotated.

> ⚠️ **Two things to settle before this code is usable by a new team** (details in
> the relevant sections):
> 1. There is **no full database schema dump** in the repo. A `pg_dump` of the
>    existing Supabase database (or transfer of the Supabase project itself) is
>    required — see [§6 Database](#6-database-supabase).
> 2. The repository currently contains **unrelated sub-projects and sensitive
>    credential files** that should be removed before handover — see
>    [§11 Before you hand over: clean the repo](#11-before-you-hand-over-clean-the-repo).

---

## 1. What the application is

Civix250 is a Next.js web application that lets citizens register, be matched to
their U.S. Congressional district, join district-based discussion groups, view
their representatives, and engage with officials. It includes admin/moderator
tooling, official dashboards, donations, video town-halls, and an AI assistant.

---

## 2. Technology stack

| Layer | Technology | Version (from `package.json`) |
|---|---|---|
| Framework | Next.js (App Router) | 16.1.7 |
| UI runtime | React / React DOM | 19.2.4 |
| Language | TypeScript | ^5 |
| Styling | Tailwind CSS | ^4 (via `@tailwindcss/postcss`) |
| Icons | lucide-react | ^1.8.0 |
| Backend / DB / Auth | Supabase (`@supabase/supabase-js`, `@supabase/ssr`) | ^2.103 / ^0.9 |
| AI | OpenAI SDK (`openai`), Anthropic SDK (`@anthropic-ai/sdk`) | ^6.34 / ^0.113 |
| Email | Nodemailer, Resend | ^9 / ^6.12 |
| XML parsing | fast-xml-parser | ^5.5 |
| Hosting | Vercel (with Cron) | — |

There is **no separate backend service**: server logic runs inside Next.js
route handlers (`app/api/**`) and server components, talking to Supabase.

---

## 3. Prerequisites (developer machine)

- **Node.js 20 LTS or newer** (developed/tested on **Node 24.14.0**, npm 11.9.0).
  Next.js 16 requires Node ≥ 20.9.
- **npm** (a `package-lock.json` is committed — use `npm`, not yarn/pnpm, to match the lockfile).
- **Git**.
- A code editor (VS Code recommended).
- Accounts / API access for the external services in [§5](#5-environment-variables)
  (at minimum a **Supabase** project and a **Google Civic Information API** key
  to boot with core functionality).

---

## 4. Repository layout (Civix250 app)

```
app/                Next.js App Router — pages + API routes
  api/              Server route handlers (see list below)
  (many route dirs) admin, dashboard, feed, chat, donate, representatives, ...
components/         Shared React components
lib/               Server/client helpers
  supabase/        Supabase client factories (client.ts, server.ts, admin.ts, presence.ts)
  config.ts        App name / tagline
  chatbot/, outreach/, og/   subsystem helpers
  moderation.ts, donor-tiers.ts, donation-tracker.ts, ...
scripts/           One-off Node scripts (state/representative seeding, imports)
sql/               Incremental SQL (table creation, RLS, per-state enablement)
public/            Static assets
next.config.ts     Next config (image remote patterns, redirects)
vercel.json        Vercel Cron schedule
```

**API route handlers** (`app/api/`): `assistant`, `moderate`, `chat-notification`,
`representatives`, `representatives-by-district`, `representative-photo`,
`active-districts`, `statewide`, `resolve-district`, `citizens`,
`campaign-finance`, `official-image`, `official-updates`, `jaas-token`,
`my-donor-tier`, `zeffy-sync`, `send-representative-email`, `send-welcome-email`,
`forgot-password`, `reset-password`, `outreach`.

---

## 5. Environment variables

Create a file named **`.env.local`** in the project root. It is git-ignored
(`.env*` is in `.gitignore`), so it is **not** in the repo — the values will be
transferred to you separately and securely (see the checklist). **Do not commit it.**

Variable names and their purpose (⚠️ = secret, keep server-side; `NEXT_PUBLIC_` =
exposed to the browser by design):

### Core — required to boot and use the platform
| Variable | Purpose | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key | Supabase → Project Settings → API |
| ⚠️ `SUPABASE_SERVICE_ROLE_KEY` | Server-side admin key (bypasses RLS; used in `lib/supabase/admin.ts`) | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL (links, emails, OG) e.g. `https://civix250.ai` or `http://localhost:3000` | Set per environment |
| ⚠️ `GOOGLE_CIVIC_API_KEY` | Google Civic Information API — representative / district lookup | Google Cloud Console → APIs |
| ⚠️ `OPENAI_API_KEY` | OpenAI — AI assistant / moderation | platform.openai.com |

### Donations (Zeffy)
| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_ZEFFY_DONATION_URL` | Zeffy embed URL for the `/donate` page |
| ⚠️ `ZEFFY_API_KEY` | Zeffy read-only API key — `/api/zeffy-sync` pulls succeeded payments |
| ⚠️ `ZEFFY_SYNC_SECRET` | Shared secret guarding `/api/zeffy-sync` (must equal Vercel `CRON_SECRET`) |
| `NEXT_PUBLIC_DONORBOX_DONATION_URL` | **Legacy** Donorbox URL (donations migrated to Zeffy — likely removable) |

### Scheduled jobs
| Variable | Purpose |
|---|---|
| ⚠️ `CRON_SECRET` | Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`; endpoints verify it |

### Email
| Variable | Purpose |
|---|---|
| `GMAIL_USER` / ⚠️ `GMAIL_APP_PASSWORD` | Gmail SMTP (welcome / representative emails via Nodemailer) — app-specific password, not the login password |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / ⚠️ `SMTP_PASS` | Zoho SMTP (`smtppro.zoho.eu`, port 465 SSL) for the outreach subsystem — `SMTP_PASS` is a Zoho **app-specific** password |
| `OUTREACH_TRANSPORT` | Selects which mail transport the outreach subsystem uses |

### Video meetings (8x8 JaaS)
| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_JAAS_APP_ID` | JaaS App ID (public) |
| ⚠️ `JAAS_KID` | JaaS API Key ID (e.g. `vpaas-magic-cookie-xxxx/abc123`) |
| ⚠️ `JAAS_PRIVATE_KEY` | JaaS RSA private key (PEM) — store as one line with literal `\n` between lines |

> **Note on Anthropic:** `@anthropic-ai/sdk` is a dependency but no
> `ANTHROPIC_API_KEY` is configured — it is used by adjacent subsystems
> (outreach/other), not core Civix250. Confirm before relying on it.

A ready-to-fill template is in [Appendix A](#appendix-a-envlocal-template).

---

## 6. Database (Supabase)

The app uses a single Supabase project providing **Postgres, Auth, Realtime, and
Storage**. Access control is enforced with **Row Level Security (RLS)** policies.

### ⚠️ Important: there is no complete schema file in the repo
The `sql/` folder holds only **incremental** scripts (individual `create-*`
tables, RLS tweaks, and per-state `allow-*-district` enablement). The core tables
(e.g. `profiles`, posts, messages, donations) were created directly in the
Supabase dashboard over time and are **not** fully reproduced here.

**To stand up a fresh environment, you need one of:**
1. **Transfer of the existing Supabase project** (recommended — preserves schema,
   RLS, auth config, storage buckets, and data), **or**
2. A **`pg_dump` of the existing database** (schema, and data if wanted), e.g.:
   ```bash
   # Schema only (structure, RLS, functions, triggers)
   pg_dump --schema-only --no-owner "<SUPABASE_DB_CONNECTION_STRING>" > civix250_schema.sql
   # Full (schema + data)
   pg_dump --no-owner "<SUPABASE_DB_CONNECTION_STRING>" > civix250_full.sql
   ```
   (Connection string: Supabase → Project Settings → Database.)

> **This is the key item to resolve in the "source code part" discussion.**

### Incremental SQL in `sql/`
Once a base schema exists, these are applied via the Supabase **SQL Editor**:
- `create-*.sql` — feature tables (town halls, official updates, outreach,
  user activity, policy-pulse surveys, post attachments, address-proof uploads,
  video meeting requests, issue depth).
- `enable-realtime-messages.sql` — adds the messages table to the
  `supabase_realtime` publication and sets replica identity (required for live chat).
- `allow-<states>-district.sql` — enables citizen signups for specific states
  (the platform gates registration to enabled states).
- `seed-*-leaders.sql` / `add-donation-recurring.sql` / outreach setup scripts.

### Operational gotchas (learned the hard way — keep these in mind)
- **Admin checks in RLS** must use a `SECURITY DEFINER` `is_admin()` helper, never
  an inline subquery against `profiles`, or RLS **infinitely recurses** (Postgres
  error `42P17`).
- **Realtime chat** needs three things together: `supabase.realtime.setAuth(token)`,
  the table in the `supabase_realtime` publication, and `REPLICA IDENTITY FULL`.
  Never put a value containing spaces in a realtime filter.
- **Registration is gated by state**: signups are limited to explicitly enabled
  states via a geocoded-state check plus a `profiles` DB trigger. Enabling a new
  state = a few code spots + running the state's `allow-*` SQL + seeding that
  state's representatives. Some states use zero-padded district numbers (e.g. `NY-01`).

---

## 7. Local setup (step by step)

```bash
# 1. Clone the repository
git clone <repo-url> civixos-v2
cd civixos-v2

# 2. Install dependencies (use npm to match package-lock.json)
npm install

# 3. Create your environment file
#    Copy the template from Appendix A into .env.local and fill in values.

# 4. Point the app at a database
#    Either use the transferred Supabase project, or restore a pg_dump into a
#    new Supabase project and apply the sql/ scripts as needed (see §6).

# 5. Run the dev server
npm run dev
#    → http://localhost:3000
```

Set `NEXT_PUBLIC_SITE_URL=http://localhost:3000` for local runs.

---

## 8. Running, building, linting

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server (hot reload) on port 3000 |
| `npm run build` | Production build (`next build --webpack`) |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |

**Data seeding scripts** (run against the DB using `.env.local`; each loads env via
`node --env-file=.env.local`). Named scripts exist in `package.json`, e.g.:
```bash
npm run seed:ca42-leaders
npm run seed:ohio-leaders
npm run check:dns
```
There are ~124 scripts in `scripts/` (per-state `seed-<state>-leaders.mjs`, Apollo
CSV import, campaign seeds). Most are one-off/administrative — not needed to run
the app, only to populate representative data for new states.

---

## 9. External services / accounts

The platform depends on these third-party services. Each needs an account and
API credentials; several also need billing set up.

| Service | Used for | Notes |
|---|---|---|
| **Supabase** | Database, Auth, Realtime, Storage, RLS | The heart of the app |
| **Vercel** | Hosting + Cron | Env vars + cron secrets must be set here |
| **Google Civic Information API** | Representative & district lookup | Google Cloud project + API key + quota |
| **OpenAI** | AI assistant / moderation | Billing required |
| **Zeffy** | Donations (embed + sync) | Read-only API key for `/api/zeffy-sync` |
| **Zoho Mail (SMTP)** | Outreach email sending | EU data center; app-specific password |
| **Gmail (SMTP)** | Transactional/welcome emails | App-specific password |
| **Resend** | Email (SDK present) | Confirm active usage / API key |
| **8x8 JaaS** | Video town-halls / meetings | App ID + API key ID + RSA private key |

---

## 10. Deployment (Vercel)

- The project deploys to **Vercel** (a `.vercel` project link and `vercel.json`
  exist in the repo, currently linked to Protim's account — this must be
  transferred or re-created under the new owner).
- **Set every environment variable** from [§5](#5-environment-variables) in
  Vercel → Project Settings → Environment Variables (for Production, Preview, and
  Development as appropriate).
- **Custom domain / DNS:** `civix250.ai` (and any outreach subdomain) must be
  pointed at the Vercel project. DNS records and domain ownership need to be
  transferred.

### Scheduled jobs (`vercel.json`)
| Endpoint | Schedule (UTC cron) | Purpose |
|---|---|---|
| `/api/zeffy-sync` | `0 * * * *` (hourly) | Pull succeeded Zeffy donations into the DB |
| `/api/outreach/cron-send` | `0 13-20 * * 1-6` (hourly 13:00–20:00, Mon–Sat) | Drip B2B outreach emails (BidSpro subsystem — see below) |

Cron requests carry `Authorization: Bearer <CRON_SECRET>`; the endpoints reject
requests without the correct secret.

---

## 11. Before you hand over: clean the repo

The working directory currently contains material that is **not part of the
Civix250 app** and/or is **sensitive**. Decide what to include, then remove the rest
before sharing the source.

**Sensitive files at the repo root — do NOT hand these over as-is (and rotate the
secrets in them):**
- `Vercel Recovery codes.docx`
- `Personal Access token.docx`
- `Oauth Client ID.docx`
- `Civix250 states login credentials.docx` and `Civix250 states login credentials/`
- `.env.local` (never share in the repo; transfer values securely instead)

**Likely-separate projects living in this repo (confirm scope with Protim):**
- `ad-studio/`, `bump-facebook-ads/`, `civix250-website/`, `policy-pulse/`
- Marketing/collateral: `*.pptx`, `*.pdf`, `*.png/jpg`, `*.screenstudio/`,
  `*-Ad.html`

**Recommended:** hand over a **clean Git repository** containing only the Civix250
application (app/, components/, lib/, scripts/, sql/, public/, config files),
with Git history reviewed to ensure **no secrets were ever committed** (rotate any
that were). A fresh repo initialized from the cleaned tree is the safest option.

---

## 12. Handover checklist

**Access to transfer**
- [ ] GitHub repository ownership / access (cleaned repo — see §11)
- [ ] Supabase project (transfer ownership) **or** provide `pg_dump` + storage export
- [ ] Vercel project (transfer or re-create) + domain `civix250.ai` + DNS
- [ ] Google Cloud project (Civic API key + billing)
- [ ] OpenAI account/org (or a new key with billing)
- [ ] Zeffy account access + API key
- [ ] Zoho Mail + Gmail mailboxes / app passwords
- [ ] 8x8 JaaS account + API key + private key

**Secrets — transfer securely, then ROTATE after handover**
- [ ] All variables in §5 (share via a password manager / secure channel, never email/repo)
- [ ] Rotate: Supabase service role key, Google Civic key, OpenAI key, Zeffy key,
      SMTP passwords, JaaS private key, `CRON_SECRET` / `ZEFFY_SYNC_SECRET`

**Knowledge transfer**
- [ ] Walk through §6 database gotchas (RLS `is_admin`, realtime, state gate)
- [ ] Confirm which subsystems are in scope (core Civix250 vs outreach/ad-studio/etc.)
- [ ] Confirm the deployment/domain cutover plan

---

## Appendix A: `.env.local` template

Copy into `.env.local` and fill in. **Never commit this file.**

```dotenv
# --- Supabase (core) ---
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# --- Site ---
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# --- APIs ---
GOOGLE_CIVIC_API_KEY=
OPENAI_API_KEY=

# --- Donations (Zeffy) ---
NEXT_PUBLIC_ZEFFY_DONATION_URL=
ZEFFY_API_KEY=
ZEFFY_SYNC_SECRET=
NEXT_PUBLIC_DONORBOX_DONATION_URL=

# --- Cron ---
CRON_SECRET=

# --- Email: Gmail SMTP (transactional) ---
GMAIL_USER=
GMAIL_APP_PASSWORD=

# --- Email: Zoho SMTP (outreach) ---
SMTP_HOST=smtppro.zoho.eu
SMTP_PORT=465
SMTP_USER=
SMTP_PASS=
OUTREACH_TRANSPORT=

# --- Video (8x8 JaaS) ---
NEXT_PUBLIC_JAAS_APP_ID=
JAAS_KID=
JAAS_PRIVATE_KEY=
```

---

_End of handover document. Questions on any section → Protim Ghosh._
