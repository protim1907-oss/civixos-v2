import yaml from "js-yaml";
const listing = await (await fetch("https://api.github.com/repos/openstates/people/contents/data/ca/legislature")).json();
if (!Array.isArray(listing)) { console.log("listing error:", listing?.message); process.exit(1); }
console.log("files:", listing.length);
const today = new Date().toISOString().slice(0,10);
const senators = [];
for (const f of listing) {
  if (!f.name.endsWith(".yml")) continue;
  const doc = yaml.load(await (await fetch(f.download_url)).text());
  const roles = doc.roles || [];
  const cur = roles.find(r => r.type === "upper" && (!r.end_date || r.end_date >= today));
  if (cur) senators.push({ d: Number(cur.district), name: doc.name, party: (doc.party||[]).find(p=>!p.end_date)?.name || doc.party?.[0]?.name, image: doc.image||"" });
}
senators.sort((a,b)=>a.d-b.d);
console.log("upper members:", senators.length);
const d10 = senators.find(s=>s.d===10);
console.log("SD-10:", d10 || "(not found)");
