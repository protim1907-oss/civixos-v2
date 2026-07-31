import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// One representatives row to reveal columns
const { data: sample } = await supabase.from("representatives").select("*").limit(1);
console.log("representatives columns:", sample?.[0] ? Object.keys(sample[0]) : "(empty)");

async function show(label, q) {
  const { data, error } = await q;
  console.log("\n=== " + label + " ===");
  if (error) return console.log("ERROR:", error.message);
  if (!data || data.length === 0) return console.log("(no rows)");
  for (const r of data)
    console.log(
      `- ${r.name} | ${r.level} | ${r.party ?? ""} | district=${r.district ?? ""} | img=${r.image_url ? "Y" : "—"}`
    );
}

await show(
  "representatives CALIFORNIA",
  supabase.from("representatives").select("name, level, party, district, district_id, image_url").eq("state", "California")
);
await show(
  "representatives GEORGIA",
  supabase.from("representatives").select("name, level, party, district, district_id, image_url").eq("state", "Georgia")
);

// Compare: an existing CA district_representatives row (any CA district) for format reference
const { data: caRows } = await supabase
  .from("district_representatives")
  .select("district_code, name, title, office_label, party, website, contact_url, phone, image_url, is_active")
  .eq("state", "California")
  .order("district_number");
console.log("\n=== district_representatives CALIFORNIA (count " + (caRows?.length ?? 0) + ") ===");
for (const r of caRows || []) console.log(`- ${r.district_code}: ${r.name} (${r.party})`);
