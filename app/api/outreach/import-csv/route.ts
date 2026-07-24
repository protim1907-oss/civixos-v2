import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/outreach/admin-guard";

// Import B2B leads from a pasted CSV (or CSV text). Deduped on email.
//
// Recognised headers (case/space/underscore-insensitive; aliases accepted):
//   email*        (required)
//   company | org | organization        -> org_name
//   name | contact | contact_name       -> contact_name
//   title | role                        -> title
//   website | url                       -> website
//   phone                               -> phone
//   region        (us | europe | uae)   -> region  (auto-inferred from country if absent)
//   country                             -> country
//   industry | sector                   -> industry
//   notes                               -> notes
//
// Rows without a valid email are skipped and reported.

// Minimal RFC-4180-ish CSV parser: handles quoted fields, escaped quotes ("")
// and commas/newlines inside quotes.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch === "\r") {
      // ignore; handled by \n
    } else {
      field += ch;
    }
  }
  // flush last field/row
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function norm(h: string): string {
  return h.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

// Header alias → canonical column.
const ALIASES: Record<string, string> = {
  email: "email",
  emailaddress: "email",
  company: "org_name",
  org: "org_name",
  organization: "org_name",
  organisation: "org_name",
  companyname: "org_name",
  name: "contact_name",
  contact: "contact_name",
  contactname: "contact_name",
  fullname: "contact_name",
  firstname: "contact_name",
  title: "title",
  role: "title",
  jobtitle: "title",
  position: "title",
  website: "website",
  url: "website",
  site: "website",
  phone: "phone",
  phonenumber: "phone",
  region: "region",
  country: "country",
  location: "country",
  industry: "industry",
  sector: "industry",
  vertical: "industry",
  notes: "notes",
  note: "notes",
};

function inferRegion(country: string | null, explicit: string | null): string | null {
  const r = (explicit || "").trim().toLowerCase();
  if (["us", "usa", "united states", "america", "north america"].includes(r)) return "us";
  if (["europe", "eu", "emea"].includes(r)) return "europe";
  if (["uae", "gulf", "middle east", "mena"].includes(r)) return "uae";
  if (r === "us" || r === "europe" || r === "uae") return r;

  const c = (country || "").trim().toLowerCase();
  if (!c) return explicit?.trim() || null;
  if (["us", "usa", "united states", "united states of america"].includes(c)) return "us";
  if (
    ["uae", "united arab emirates", "u.a.e.", "dubai", "abu dhabi", "sharjah"].includes(c)
  )
    return "uae";
  const europe = [
    "uk", "united kingdom", "england", "ireland", "germany", "france", "spain",
    "italy", "portugal", "netherlands", "belgium", "sweden", "norway", "denmark",
    "finland", "poland", "austria", "switzerland", "czech", "czechia", "greece",
    "romania", "hungary", "estonia", "lithuania", "latvia", "bulgaria", "croatia",
    "slovakia", "slovenia", "luxembourg", "iceland",
  ];
  if (europe.includes(c)) return "europe";
  return explicit?.trim() || null;
}

function cleanEmail(v: string | undefined): string | null {
  if (!v) return null;
  const m = v.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  return m?.[0]?.toLowerCase() || null;
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = (await request.json().catch(() => ({}))) as { csv?: string };
  const csv = (body.csv || "").trim();
  if (!csv) return NextResponse.json({ error: "csv text is required." }, { status: 400 });

  const rows = parseCsv(csv);
  if (rows.length < 2) {
    return NextResponse.json(
      { error: "CSV needs a header row and at least one data row." },
      { status: 400 }
    );
  }

  const header = rows[0].map((h) => ALIASES[norm(h)] || norm(h));
  const emailIdx = header.indexOf("email");
  if (emailIdx === -1) {
    return NextResponse.json(
      { error: "CSV must include an 'email' column." },
      { status: 400 }
    );
  }

  const leads = new Map<string, Record<string, unknown>>();
  let skippedNoEmail = 0;

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i];
    const get = (col: string): string | null => {
      const idx = header.indexOf(col);
      const v = idx === -1 ? undefined : cells[idx];
      return v && v.trim() ? v.trim() : null;
    };

    const email = cleanEmail(cells[emailIdx]);
    if (!email) {
      skippedNoEmail++;
      continue;
    }

    const country = get("country");
    const region = inferRegion(country, get("region"));

    leads.set(email, {
      email,
      org_name: get("org_name"),
      contact_name: get("contact_name"),
      title: get("title"),
      website: get("website"),
      phone: get("phone"),
      region,
      country,
      industry: get("industry"),
      notes: get("notes"),
      source: "csv",
      status: "new",
    });
  }

  const values = [...leads.values()];
  if (values.length === 0) {
    return NextResponse.json({
      imported: 0,
      skippedNoEmail,
      message: "No rows with a usable email address were found.",
    });
  }

  // Upsert on email → idempotent re-imports; existing leads are not clobbered.
  const { error } = await supabaseAdmin
    .from("outreach_leads")
    .upsert(values, { onConflict: "email", ignoreDuplicates: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ imported: values.length, skippedNoEmail });
}
