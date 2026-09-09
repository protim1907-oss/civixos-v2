import { createClient } from "@supabase/supabase-js";
import fs from "fs";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const usable = JSON.parse(fs.readFileSync("/tmp/mvp_new.json","utf8"));
const rows = usable.map(v=>({
  email:v.email, contact_name:v.contact_name, title:v.title, org_name:v.org_name,
  industry:v.industry, website:v.website, country:v.country||"United States", region:"us",
  source:"apollo", status:"new", tags:["mvp-0909"],
}));
async function insertOne(r){
  for(let a=0;a<3;a++){
    const { error } = await s.from("outreach_leads").insert(r);
    if(!error) return "ok";
    if(/duplicate|unique/i.test(error.message)) return "dup";
    await sleep(1500); // transient (schema cache / latency) -> retry
  }
  return "fail";
}
let ok=0,dup=0,fail=0;
for(let i=0;i<rows.length;i+=20){
  const batch = rows.slice(i,i+20);
  let berr=null;
  for(let a=0;a<3;a++){ const { error }=await s.from("outreach_leads").insert(batch); if(!error){berr=null;break;} berr=error; await sleep(2000); }
  if(!berr){ ok+=batch.length; }
  else {
    // fall back to per-row (handles dupes + partial transient)
    for(const r of batch){ const res=await insertOne(r); if(res==="ok")ok++; else if(res==="dup")dup++; else fail++; }
  }
  process.stdout.write(`\r progress: ok=${ok} dup=${dup} fail=${fail} (of ${rows.length})`);
}
console.log(`\nDONE. inserted=${ok}, duplicates=${dup}, failed=${fail}`);
