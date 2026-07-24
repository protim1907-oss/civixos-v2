# Outreach Agent

An AI cold-outreach agent with human approval, suppression, daily caps, and
CAN-SPAM-compliant footers. One engine serves multiple use cases:

- **BidSpro (B2B):** cold outreach to founders building an MVP (US / Europe / UAE),
  from `protimghosh@bidsprointernational.com`.
- **Civix250 (B2G):** the original government-office campaigns.

UI: `/outreach` (admin-only). All data is service-role-only (RLS on, no policies);
API routes under `/api/outreach/*` are the access boundary via `requireAdmin`.

## Pipeline

1. **Import leads** — paste CSV at `/outreach` (`POST /api/outreach/import-csv`).
2. **Create a campaign** — sender identity + offering + audience filter.
3. **Draft (AI)** — `POST /api/outreach/draft` personalizes one email per lead
   (OpenAI, `lib/outreach/draft.ts`). Persona is driven by the campaign.
4. **Review & approve** — edit/approve each draft in the UI. Nothing sends
   without a human approving it.
5. **Send** — `POST /api/outreach/send` sends only `approved` messages, throttled
   to the campaign's `daily_cap`, skipping suppressed addresses.
6. **Unsubscribe / suppression** — every email has a signed one-click unsubscribe
   link (RFC 8058); opt-outs and bounces go on a global suppression list checked
   before every send.

## One-time setup for BidSpro

### 1. Apply the schema upgrade
Run in Supabase → SQL Editor (after `sql/create-outreach.sql`):
```
sql/upgrade-outreach-b2b.sql
```
Adds `region/country/industry` to leads and `sender_org/offering/footer_reason`
to campaigns.

### 2. Configure the email transport
Sending is transport-agnostic. Pick ONE and add to `.env.local`:

**Option A — Resend (recommended for deliverability):**
```
RESEND_API_KEY=re_...
```
Verify `bidsprointernational.com` as a domain in the Resend dashboard first,
otherwise the `From:` address will be rejected.

**Option B — SMTP (e.g. Google Workspace mailbox for the domain):**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=protimghosh@bidsprointernational.com
SMTP_PASS=<app password>
```
Force a transport explicitly with `OUTREACH_TRANSPORT=resend|smtp`; otherwise it
auto-detects (Resend if `RESEND_API_KEY` is set, else SMTP).

> `OPENAI_API_KEY` is already configured and powers drafting
> (`OUTREACH_DRAFT_MODEL` overrides the model, default `gpt-4.1-mini`).

### 3. Set a real postal address
CAN-SPAM requires a physical postal address in every commercial email. Edit the
campaign's **Postal address** field (the seed script leaves a placeholder).

### 4. Seed the campaign (optional shortcut)
```
npm run seed:bidspro-campaign
```
Creates/updates the "MVP prospects — US / Europe / UAE" campaign. You can also
just fill in the New Campaign form at `/outreach`.

## CSV format

Header row required. `email` is the only required column. Recognised columns
(aliases accepted, case/spacing-insensitive):

| column     | aliases                          | notes                          |
|------------|----------------------------------|--------------------------------|
| `email`    | email address                    | required; row skipped if absent |
| `company`  | org, organization, company name  | → `org_name`                   |
| `name`     | contact, contact name, full name | → `contact_name`               |
| `title`    | role, job title, position        |                                |
| `website`  | url, site                        |                                |
| `phone`    | phone number                     |                                |
| `country`  | location                         | region inferred from this      |
| `region`   |                                  | `us` / `europe` / `uae`        |
| `industry` | sector, vertical                 |                                |
| `notes`    | note                             | passed to the AI as context    |

Re-imports are idempotent (deduped on email; existing leads aren't overwritten).

## Compliance notes

- Human approval is mandatory before any send.
- Working one-click unsubscribe + global suppression list on every send.
- Physical postal address required (campaign field).
- Cold B2B outreach is regulated differently by jurisdiction. In particular,
  **EU/UK (GDPR/PECR)** and the **UAE** have stricter consent/relevance rules than
  US CAN-SPAM — keep targeting relevant, honor opt-outs immediately, and confirm
  your own legal basis before emailing EU/UAE recipients.
