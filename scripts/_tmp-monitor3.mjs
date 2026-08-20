import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const { data: c } = await s.from("outreach_campaigns").select("id").eq("name","MVP prospects — US / Europe / UAE").single();

const start = new Date(); start.setUTCHours(0,0,0,0); // start of today UTC
let lastSentToday = -1;
for (let i=0;i<80;i++){          // up to ~6.7h at 5-min polls
  const { data: m } = await s.from("outreach_messages").select("status,sent_at,to_email").eq("campaign_id",c.id);
  const by={}; m.forEach(x=>by[x.status]=(by[x.status]||0)+1);
  const approved = by.approved||0;
  const failed = m.filter(x=>x.status==="failed");
  const sentToday = m.filter(x=>x.status==="sent" && x.sent_at && new Date(x.sent_at)>=start).length;
  if (sentToday !== lastSentToday){ console.log(`[${new Date().toISOString().slice(11,16)}Z] sentToday=${sentToday}, approved left=${approved}, failed=${failed.length}`); lastSentToday=sentToday; }
  if (approved === 0 && sentToday > 0){
    console.log(`DONE: batch 3 complete. Sent today=${sentToday}, failed=${failed.length}, approved left=0.`);
    if (failed.length) failed.slice(0,5).forEach(f=>console.log("  FAIL:", f.to_email, "::", (f.error||"").slice(0,60)));
    process.exit(0);
  }
  if (failed.length > 0){
    console.log(`ALERT: ${failed.length} failed send(s) detected.`);
    failed.slice(0,5).forEach(f=>console.log("  FAIL:", f.to_email));
    process.exit(2);
  }
  await sleep(300000);
}
console.log("Timeout after ~6.7h — batch 3 not fully sent; check cron/Vercel logs.");
process.exit(1);
