import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
async function show(label, state) {
  const { data, error } = await supabase.from("representatives").select("name, full_name, level, office, office_title, party, district, district_id, photo_url, photo, is_primary, is_active").eq("state", state);
  console.log("\n=== representatives " + label + " (count " + (data?.length ?? 0) + ") ===");
  if (error) return console.log("ERROR:", error.message);
  for (const r of data || []) console.log(`- ${r.name || r.full_name} | lvl=${r.level} | office=${r.office || r.office_title || ""} | party=${r.party ?? ""} | district=${r.district ?? ""} | did=${r.district_id ?? ""} | photo=${(r.photo_url||r.photo)?"Y":"—"} | primary=${r.is_primary} | active=${r.is_active}`);
}
await show("CALIFORNIA", "California");
await show("GEORGIA", "Georgia");
