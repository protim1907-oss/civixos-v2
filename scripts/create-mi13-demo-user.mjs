import { createClient } from "@supabase/supabase-js";
const url=process.env.NEXT_PUBLIC_SUPABASE_URL, svc=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!svc){console.error("Missing Supabase env.");process.exit(1);}
const s=createClient(url,svc,{auth:{autoRefreshToken:false,persistSession:false}});
const D={email:"mi13.demo@civix250.com",password:"MI13-Demo-2026!",full_name:"MI Demo Citizen",role:"citizen",district:"MI-13",state:"Michigan",street_address:"500 Griswold St",city:"Detroit",zip_code:"48226"};
async function main(){
  let id=null;
  const {data:c,error}=await s.auth.admin.createUser({email:D.email,password:D.password,email_confirm:true,user_metadata:{full_name:D.full_name,state:D.state,district:D.district,role:D.role}});
  if(error){const m=error.message.toLowerCase();
    if(m.includes("already")||m.includes("registered")||m.includes("exists")){
      const {data:l}=await s.auth.admin.listUsers({page:1,perPage:1000});const ex=l.users.find(u=>(u.email||"").toLowerCase()===D.email);
      if(!ex){console.error("exists but not found");process.exit(1);} id=ex.id;
      await s.auth.admin.updateUserById(id,{password:D.password,email_confirm:true});console.log("existed — password reset.");
    } else {console.error("create failed:",error.message);process.exit(1);}
  } else {id=c.user.id;console.log("Created auth user:",id);}
  const {error:pe}=await s.from("profiles").upsert({id,full_name:D.full_name,email:D.email,role:D.role,district:D.district,state:D.state,street_address:D.street_address,city:D.city,zip_code:D.zip_code},{onConflict:"id"});
  if(pe){console.error("profile upsert failed:",pe.message);process.exit(1);}
  console.log("\nMI-13 demo account ready:\n  Email:    "+D.email+"\n  Password: "+D.password+"\n  District: "+D.district);
}
main().catch(e=>{console.error(e);process.exit(1);});
