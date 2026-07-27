import { createClient } from "@supabase/supabase-js";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) { console.error("Missing Supabase env."); process.exit(1); }
const supabase = createClient(supabaseUrl, serviceRoleKey, { auth:{autoRefreshToken:false, persistSession:false}});
const DEMO = {
  email:"ga5.demo@civix250.com", password:"GA5-Demo-2026!",
  full_name:"GA Demo Citizen", role:"citizen",
  district:"GA-05", state:"Georgia",
  street_address:"100 Peachtree St NW", city:"Atlanta", zip_code:"30303",
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
  const { error:pe } = await supabase.from("profiles").upsert({
    id:userId, full_name:DEMO.full_name, email:DEMO.email, role:DEMO.role,
    district:DEMO.district, state:DEMO.state, street_address:DEMO.street_address, city:DEMO.city, zip_code:DEMO.zip_code,
  }, { onConflict:"id" });
  if (pe){ console.error("Profile upsert failed:", pe.message); process.exit(1); }
  console.log("\nGA-05 demo account ready:\n  Email:    "+DEMO.email+"\n  Password: "+DEMO.password+"\n  District: "+DEMO.district);
}
main().catch(e=>{ console.error(e); process.exit(1); });
