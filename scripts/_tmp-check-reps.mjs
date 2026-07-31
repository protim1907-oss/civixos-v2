import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function show(label, q) {
  const { data, error } = await q;
  console.log("\n=== " + label + " ===");
  if (error) return console.log("ERROR:", error.message);
  if (!data || data.length === 0) return console.log("(no rows)");
  console.log(JSON.stringify(data, null, 2));
}

// 1. The two users
await show(
  "PROFILES (Bruce Lechner / Larry Fish)",
  supabase
    .from("profiles")
    .select("full_name, email, role, district, state")
    .or("full_name.ilike.%bruce lechner%,full_name.ilike.%larry fish%")
);

// 2. Assigned district rep (US House) for each district
await show(
  "district_representatives CA-10 / CA-10 variants",
  supabase
    .from("district_representatives")
    .select("district_code, state, district_number, name, title, party, image_url, is_active")
    .in("district_code", ["CA-10", "CA-010"])
);
await show(
  "district_representatives GA-03 variants",
  supabase
    .from("district_representatives")
    .select("district_code, state, district_number, name, title, party, image_url, is_active")
    .in("district_code", ["GA-03", "GA-3"])
);

// 3. Statewide + state legislators for CA and GA
await show(
  "representatives CA",
  supabase
    .from("representatives")
    .select("name, title, level, party, district, district_id, image_url, email_href, linkedin_url")
    .eq("state", "California")
);
await show(
  "representatives GA",
  supabase
    .from("representatives")
    .select("name, title, level, party, district, district_id, image_url, email_href, linkedin_url")
    .eq("state", "Georgia")
);
