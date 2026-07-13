// One-off backfill: set platform_donations.recurring from Givebutter.
//
// Prerequisites:
//   1. Run sql/add-donation-recurring.sql (adds the `recurring` column).
//   2. A valid Givebutter API key (Settings → Developers → API → New API key).
//
// Usage:
//   GIVEBUTTER_API_KEY='xxxx|yyyy' node --env-file=.env.local scripts/backfill-donation-recurring.mjs
//
// Matches each succeeded Givebutter transaction to a platform_donations row by
// the transaction id embedded in notes, else by donor email + amount, and sets
// `recurring` = true when Givebutter attached a recurring plan/frequency.

import { createClient } from "@supabase/supabase-js";

const GB_KEY = process.env.GIVEBUTTER_API_KEY;
if (!GB_KEY) {
  console.error("Missing GIVEBUTTER_API_KEY. See usage at the top of this file.");
  process.exit(1);
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const isRecurring = (t) =>
  Boolean(
    t.plan ||
      t.plan_id ||
      t.recurring === true ||
      (t.frequency && String(t.frequency).toLowerCase() !== "once")
  );

async function fetchAllTransactions() {
  const all = [];
  let url = "https://api.givebutter.com/v1/transactions?per_page=100";
  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${GB_KEY}`, Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Givebutter API ${res.status}`);
    const json = await res.json();
    all.push(...(json.data || []));
    url = json.links?.next || json.next_page_url || null;
  }
  return all;
}

async function main() {
  // Guard: confirm the column exists.
  const probe = await db.from("platform_donations").select("id, recurring").limit(1);
  if (probe.error) {
    console.error("`recurring` column missing — run sql/add-donation-recurring.sql first.");
    process.exit(1);
  }

  const txns = (await fetchAllTransactions()).filter(
    (t) => (t.status || "").toLowerCase() === "succeeded"
  );
  console.log(`fetched ${txns.length} succeeded transactions`);

  const { data: rows } = await db
    .from("platform_donations")
    .select("id, donor_email, amount, notes, recurring");

  let updated = 0;
  for (const t of txns) {
    const recurring = isRecurring(t);
    if (!recurring) continue; // column already defaults to false

    // 1) match by Givebutter transaction id in notes
    let match = rows.find((r) => (r.notes || "").includes(String(t.id)));
    // 2) fallback: email + amount
    if (!match) {
      match = rows.find(
        (r) =>
          (r.donor_email || "").toLowerCase() === (t.email || "").toLowerCase() &&
          Number(r.amount) === Number(t.amount)
      );
    }
    if (!match) {
      console.log(`  no local row for txn ${t.id} (${t.email}, $${t.amount})`);
      continue;
    }
    if (match.recurring === true) continue;

    const { error } = await db
      .from("platform_donations")
      .update({ recurring: true })
      .eq("id", match.id);
    if (error) console.log(`  update error for ${match.id}: ${error.message}`);
    else {
      updated++;
      console.log(`  set recurring=true: ${t.email} $${t.amount}`);
    }
  }
  console.log(`\ndone — ${updated} donation(s) marked recurring; the rest remain one-time.`);
}

main().catch((e) => {
  console.error("backfill failed:", e.message);
  process.exit(1);
});
