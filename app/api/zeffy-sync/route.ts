import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Zeffy donation sync. Zeffy's read-only REST API is pulled and new succeeded
// payments are recorded into platform_donations. Use this instead of a webhook
// (this org's Zeffy account exposes an API key but not the webhook UI).
//
// Trigger periodically, e.g. a Vercel Cron or any scheduler hitting:
//   GET https://civix250.ai/api/zeffy-sync?token=<ZEFFY_SYNC_SECRET>
// It is idempotent: gifts already recorded (matched by Zeffy payment id in the
// notes column) are skipped, so it is safe to run as often as you like.
//
// Env: ZEFFY_API_KEY  (Bearer token from Zeffy → Settings → Integrations)
//      ZEFFY_SYNC_SECRET (shared secret guarding this endpoint)

const ZEFFY_API = "https://api.zeffy.com/api/v1/payments";
const PAGE_LIMIT = 100;
const MAX_PAGES = 50; // safety cap: up to 5,000 payments per run

type ZeffyPayment = {
  id: string;
  created?: number; // unix seconds
  amount?: number; // cents
  currency?: string;
  status?: string;
  description?: string | null;
  buyer?: {
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    is_corporate?: boolean;
    company_name?: string | null;
  } | null;
  recurring?: { is_recurring?: boolean } | null;
};

type ZeffyPage = {
  data?: ZeffyPayment[];
  has_more?: boolean;
  next_cursor?: string | null;
};

function isValidToken(received: string | null, secret: string) {
  if (!received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function paymentTag(id: string) {
  return `Zeffy payment ${id}`;
}

function donorName(p: ZeffyPayment): string | null {
  const buyer = p.buyer;
  if (!buyer) return null;
  if (buyer.is_corporate && buyer.company_name?.trim()) return buyer.company_name.trim();
  const name = [buyer.first_name, buyer.last_name]
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean)
    .join(" ");
  return name || null;
}

async function runSync() {
  const apiKey = process.env.ZEFFY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ZEFFY_API_KEY is not configured." }, { status: 503 });
  }

  // 1) Pull all payments from Zeffy, following the cursor.
  const payments: ZeffyPayment[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL(ZEFFY_API);
    url.searchParams.set("limit", String(PAGE_LIMIT));
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("Zeffy API error:", res.status, body.slice(0, 300));
      return NextResponse.json(
        { error: `Zeffy API returned ${res.status}` },
        { status: 502 }
      );
    }
    const json: ZeffyPage = await res.json();
    for (const p of json.data ?? []) payments.push(p);
    if (!json.has_more || !json.next_cursor) break;
    cursor = json.next_cursor;
  }

  const succeeded = payments.filter((p) => p.status === "succeeded" && p.id);

  // 2) Find which Zeffy payments are already recorded (dedupe by id in notes).
  const { data: existingRows, error: readErr } = await supabaseAdmin
    .from("platform_donations")
    .select("notes")
    .eq("payment_method", "zeffy");

  if (readErr) {
    console.error("Failed to read existing donations:", readErr.message);
    return NextResponse.json({ error: "Failed to read existing donations." }, { status: 500 });
  }

  const recordedIds = new Set<string>();
  for (const row of existingRows ?? []) {
    const m = typeof row.notes === "string" ? row.notes.match(/Zeffy payment (\S+)/) : null;
    if (m) recordedIds.add(m[1]);
  }

  // 3) Build rows for gifts we haven't recorded yet.
  const newRows = succeeded
    .filter((p) => !recordedIds.has(p.id))
    .map((p) => {
      const amount = Number(p.amount);
      if (!Number.isFinite(amount) || amount <= 0) return null;
      const notes = [paymentTag(p.id), p.description?.trim()].filter(Boolean).join(" — ");
      return {
        donor_name: donorName(p),
        donor_email: p.buyer?.email?.trim() || null,
        amount: amount / 100, // Zeffy amounts are in cents
        currency: (p.currency || "usd").toUpperCase(),
        payment_method: "zeffy",
        recurring: p.recurring?.is_recurring === true,
        notes: notes || null,
        created_at: p.created ? new Date(p.created * 1000).toISOString() : undefined,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (newRows.length === 0) {
    return NextResponse.json({
      ok: true,
      scanned: succeeded.length,
      inserted: 0,
      skipped: succeeded.length,
    });
  }

  const { error: insertErr } = await supabaseAdmin.from("platform_donations").insert(newRows);
  if (insertErr) {
    console.error("Failed to insert donations:", insertErr.message);
    return NextResponse.json({ error: "Failed to insert donations." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    scanned: succeeded.length,
    inserted: newRows.length,
    skipped: succeeded.length - newRows.length,
  });
}

export async function GET(req: NextRequest) {
  const secret = process.env.ZEFFY_SYNC_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Zeffy sync is not configured." }, { status: 503 });
  }
  if (!isValidToken(req.nextUrl.searchParams.get("token"), secret)) {
    return NextResponse.json({ error: "Invalid token." }, { status: 401 });
  }
  return runSync();
}

// Allow POST too, so schedulers that only send POST can trigger it.
export const POST = GET;
