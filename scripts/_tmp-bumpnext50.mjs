import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const closing = /^(best|thanks|thank you|regards|kind regards|warm regards|best regards|cheers|sincerely|talk soon|looking forward|yours( truly| sincerely)?)\b[\s,.!—-]*$/i;

const { data: c } = await s.from("outreach_campaigns").select("*").eq("name","Bump — freelancers (US/EU)").single();
const names = new Set();
for (const src of [c.from_name, c.sender_org]) { if(!src) continue; const v=src.trim().toLowerCase(); names.add(v); for(const t of v.split(/\s+/)) if(t.length>1) names.add(t); }
function strip(body){
  let lines = body.replace(/\r/g,"").split("\n");
  while(lines.length && !lines[lines.length-1].trim()) lines.pop();
  const w = Math.min(6, lines.length);
  for(let k=lines.length-w;k<lines.length;k++){ if(k>=0 && closing.test((lines[k]||"").trim())){ lines=lines.slice(0,k); break; } }
  while(lines.length){ const last=(lines[lines.length-1]||"").trim(); if(!last){lines.pop();continue;} if(names.has(last.toLowerCase())){lines.pop();continue;} break; }
  return lines.join("\n").trim();
}
await s.from("outreach_messages").delete().eq("campaign_id", c.id).eq("status","drafted");
const { data: msgd } = await s.from("outreach_messages").select("lead_id").eq("campaign_id",c.id);
const done = new Set(msgd.map(m=>m.lead_id));
const { data: all } = await s.from("outreach_leads").select("*").order("created_at",{ascending:true});
const bump = all.filter(l=>(l.source==='apollo-bump' || (l.tags||[]).includes('bump')) && l.email && !done.has(l.id));
console.log(`Unmessaged Bump leads available: ${bump.length}`);
const next = bump.slice(0,50);
const reg={}; next.forEach(l=>{const k=(l.country||"?"); reg[k]=(reg[k]||0)+1;});
console.log("Selected 50 by top country:", JSON.stringify(Object.entries(reg).sort((a,b)=>b[1]-a[1]).slice(0,8)));

function leadContext(l){return [l.contact_name&&`Contact: ${l.contact_name}`,l.title&&`Title/Role: ${l.title}`,l.org_name&&`Company: ${l.org_name}`,l.industry&&`Industry: ${l.industry}`,l.country&&`Country: ${l.country}`,l.website&&`Website: ${l.website}`].filter(Boolean).join("\n");}
const org=c.sender_org, offering=c.offering;
const system=[`You write concise, professional B2B cold-outreach emails on behalf of ${org}.`,`What ${org} offers: ${offering}.`,"Rules:","- Be genuine and specific to the recipient; never sound like mass spam.","- 70-130 words. Plain, warm, direct. No hype, no emojis, no ALL-CAPS.","- Honest subject line reflecting the body (CAN-SPAM). No clickbait.","- Lead with a relevant hook, then one clear low-friction CTA.","- Do NOT fabricate facts.","- Do NOT include a signature block, unsubscribe line, or postal address — appended automatically.",'Return ONLY minified JSON: {"subject":"...","body":"..."}'].join("\n");

let ok=0,fail=0; const bad=[];
for(const lead of next){
  try{
    const userPrompt=`Campaign goal: ${c.goal}\nAdditional guidance / talking points:\n${c.ai_prompt}\nSender name: ${c.from_name}\nSender organization: ${org}\n\nRecipient details:\n${leadContext(lead)}\n\nWrite the email now. Return only the JSON.`;
    const r=await client.chat.completions.create({ model:process.env.OUTREACH_DRAFT_MODEL||"gpt-4.1-mini", temperature:0.7, max_tokens:700, response_format:{type:"json_object"}, messages:[{role:"system",content:system},{role:"user",content:userPrompt}] });
    const p=JSON.parse(r.choices[0].message.content);
    let body=strip(p.body.trim()); if(!body) body=p.body.trim();
    const L=body.split("\n").map(x=>x.trim()).filter(Boolean);
    if(L.slice(-3).some(x=>closing.test(x)) || names.has((L[L.length-1]||"").toLowerCase())) bad.push(lead.email);
    const { error }=await s.from("outreach_messages").insert({ campaign_id:c.id, lead_id:lead.id, to_email:lead.email, subject:p.subject.trim(), body, status:"approved", approved_at:new Date().toISOString() });
    if(error) throw new Error(error.message);
    ok++;
  }catch(e){ fail++; console.log(`  x ${lead.email}: ${e.message}`); }
}
const { data: allm } = await s.from("outreach_messages").select("status").eq("campaign_id",c.id);
const by={}; allm.forEach(x=>by[x.status]=(by[x.status]||0)+1);
console.log(`Generated & APPROVED ${ok} (fail ${fail}), sign-off issues ${bad.length}. Bump totals: ${JSON.stringify(by)}`);
