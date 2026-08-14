import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: c } = await s.from("outreach_campaigns").select("id").eq("name","MVP prospects — US / Europe / UAE").single();
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const baseline = 1; // the test send already counted
for (let i=0;i<30;i++){
  const { data: m } = await s.from("outreach_messages").select("status,sent_at,to_email").eq("campaign_id",c.id);
  const sent = m.filter(x=>x.status==="sent");
  const failed = m.filter(x=>x.status==="failed");
  if (sent.length > baseline || failed.length > 0){
    console.log(`Cron fired. SENT=${sent.length} (was ${baseline}), FAILED=${failed.length}, APPROVED left=${m.filter(x=>x.status==="approved").length}`);
    if (failed.length) failed.slice(0,3).forEach(f=>console.log("  FAIL:", f.to_email));
    const newly = sent.filter(x=>x.to_email!=="protimghosh@bidsprointernational.com").slice(0,8).map(x=>x.to_email);
    console.log("  Recent prospect sends:", newly.join(", ") || "(none yet)");
    process.exit(0);
  }
  await sleep(120000);
}
console.log("No new sends detected after ~60 min — cron may not have fired; check Vercel cron logs / consider UI Send approved.");
process.exit(1);
