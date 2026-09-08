import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false}});
const { data:list } = await sb.auth.admin.listUsers({ page:1, perPage:1000 });
const rx = /\.demo@civix250\.com$/i;
const demo = list.users.filter(u => rx.test(u.email||""));
let ok=0, fail=0; const failed=[];
for(const u of demo){
  // best-effort: clear profile row first (in case FK doesn't cascade), then auth user
  await sb.from("profiles").delete().eq("id", u.id);
  const { error } = await sb.auth.admin.deleteUser(u.id);
  if(error){ fail++; failed.push(`${u.email}: ${error.message}`); }
  else ok++;
}
console.log(`Deleted: ${ok} / ${demo.length}`);
if(failed.length){ console.log("FAILED:"); failed.forEach(f=>console.log("  -",f)); }
// verify none remain
const { data:after } = await sb.auth.admin.listUsers({ page:1, perPage:1000 });
const remaining = after.users.filter(u => rx.test(u.email||""));
console.log("Remaining demo users:", remaining.length);
console.log("Total users now:", after.users.length);
