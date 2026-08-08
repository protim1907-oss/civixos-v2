import { createClient } from "@supabase/supabase-js";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) { console.error("Missing Supabase env."); process.exit(1); }
const supabase = createClient(supabaseUrl, serviceRoleKey, { auth:{autoRefreshToken:false, persistSession:false}});
const DEMO = {
  email:"dc.demo@civix250.com", password:"DC-Demo-2026!",
  full_name:"DC Demo Citizen", role:"citizen",
  district:"DC-98", state:"District of Columbia",
  street_address:"1350 Pennsylvania Ave NW", city:"Washington", zip_code:"20004",
};
async function main(){
  let userId=null;
  const { data:created, error:createError } = await supabase.auth.admin.createUser({
    email:DEMO.email, password:DEMO.password, email_confirm:true,
    user_metadata:{ full_name:DEMO.full_name, state:DEMO.state, district:DEMO.district, role:DEMO.role },
  });
  if (createError){
    const m=createError.message.toLowerCase();
    if (m.includes("already")||m.includes("registered")||m.includes("exists")){
      const { data:list } = await supabase.auth.admin.listUsers({page:1, perPage:1000});
      const ex=list.users.find(u=>(u.email||"").toLowerCase()===DEMO.email);
      if(!ex){ console.error("exists but not found"); process.exit(1); }
      userId=ex.id;
      await supabase.auth.admin.updateUserById(userId,{ password:DEMO.password, email_confirm:true });
      console.log("User already existed — password reset.");
    } else { console.error("Failed to create auth user:", createError.message); process.exit(1); }
  } else { userId=created.user.id; console.log("Created auth user:", userId); }

  const { error:profileError } = await supabase.from("profiles").upsert({
    id:userId, full_name:DEMO.full_name, email:DEMO.email, role:DEMO.role,
    district:DEMO.district, state:DEMO.state,
    street_address:DEMO.street_address, city:DEMO.city, zip_code:DEMO.zip_code,
  }, { onConflict:"id" });
  if (profileError){ console.error("Failed to upsert profile:", profileError.message); process.exit(1); }

  console.log("\nDC demo account ready:");
  console.log("  Email:    "+DEMO.email);
  console.log("  Password: "+DEMO.password);
  console.log("  District: "+DEMO.district);
}
main().catch(e=>{ console.error("Unexpected error:", e); process.exit(1); });
