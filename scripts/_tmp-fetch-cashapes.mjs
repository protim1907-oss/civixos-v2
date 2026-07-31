import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: dr } = await supabase.from("district_representatives").select("*").eq("district_code","CA-42").maybeSingle();
console.log("=== district_representatives CA-42 (Robert Garcia) ===");
console.log(JSON.stringify(dr, null, 2));
const { data: rep } = await supabase.from("representatives").select("*").eq("name","Lena Gonzalez").maybeSingle();
console.log("\n=== representatives Lena Gonzalez (CA State Senate) ===");
console.log(JSON.stringify(rep, null, 2));
