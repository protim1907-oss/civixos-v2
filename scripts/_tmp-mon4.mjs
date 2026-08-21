import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const { data: c } = await s.from("outreach_campaigns").select("id").eq("name","MVP prospects — US / Europe / UAE").single();
const start = new Date(); start.setUTCHours(0,0,0,0);
let last=-1;
for (let i=0;i<80;i++){
  const { data: m } = await s.from("outreach_messages").select("status,sent_at,to_email,error").eq("campaign_id",c.id);
  const approved = m.filter(x=>x.status==="approved").length;
  const failed = m.filter(x=>x.status==="failed");
  const sentToday = m.filter(x=>x.status==="sent" && x.sent_at && new Date(x.sent_at)>=start).length;
  if (sentToday!==last){ console.log(`[${new Date().toISOString().slice(11,16)}Z] MVP sentToday=${sentToday}, approved left=${approved}, failed=${failed.length}`); last=sentToday; }
  if (approved===0 && sentToday>0){ console.log(`DONE: MVP batch 4 complete. sentToday=${sentToday}, failed=${failed.length}.`); failed.slice(0,5).forEach(f=>console.log("  FAIL:",f.to_email,"::",(f.error||"").slice(0,60))); process.exit(0); }
  if (failed.length>0){ console.log(`ALERT: ${failed.length} failed send(s).`); failed.slice(0,5).forEach(f=>console.log("  FAIL:",f.to_email)); process.exit(2); }
  await sleep(300000);
}
console.log("Timeout ~6.7h — MVP batch 4 not fully sent; check cron/Vercel logs.");
process.exit(1);
