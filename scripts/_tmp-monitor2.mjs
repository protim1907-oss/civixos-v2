import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: c } = await s.from("outreach_campaigns").select("id").eq("name","MVP prospects — US / Europe / UAE").single();
const sleep = ms => new Promise(r=>setTimeout(r,ms));
let lastSent = 9;
for (let i=0;i<80;i++){
  await sleep(150000); // 2.5 min
  const { data: m } = await s.from("outreach_messages").select("status,sent_at").eq("campaign_id",c.id);
  const sent = m.filter(x=>x.status==="sent").length;
  const failed = m.filter(x=>x.status==="failed").length;
  const approved = m.filter(x=>x.status==="approved").length;
  if (failed>0){ console.log(`ALERT: ${failed} FAILED sends. sent=${sent} approved=${approved}`); process.exit(0); }
  if (sent!==lastSent){ console.log(`Progress: sent=${sent}, approved left=${approved}`); lastSent=sent; }
  // today's cap is 25 total; stop when quota reached (approved may remain for tomorrow)
  const start=new Date(); start.setUTCHours(0,0,0,0);
  const sentToday = m.filter(x=>x.status==="sent" && x.sent_at && new Date(x.sent_at)>=start).length;
  if (sentToday>=25){ console.log(`Today's drip complete: sentToday=${sentToday}, approved left (for tomorrow)=${approved}`); process.exit(0); }
}
console.log("Monitor window ended.");
process.exit(0);
