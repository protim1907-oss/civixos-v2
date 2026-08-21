// One-off: raise the Bump campaign's daily_cap.
//   node --env-file=.env.local scripts/set-bump-cap.mjs [cap]
import { createClient } from "@supabase/supabase-js";

const cap = Number(process.argv[2] || 50);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const { data, error } = await supabase
  .from("outreach_campaigns")
  .update({ daily_cap: cap })
  .eq("name", "Bump — freelancers (US/EU)")
  .select("name,daily_cap,status")
  .single();

if (error) { console.error("Failed:", error.message); process.exit(1); }
console.log("Updated:", data);
