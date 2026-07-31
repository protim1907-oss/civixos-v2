import yaml from "js-yaml";
const listing = await (await fetch("https://api.github.com/repos/openstates/people/contents/data/ca/legislature")).json();
if (!Array.isArray(listing)) { console.log("listing error:", listing?.message); process.exit(1); }
const today = new Date().toISOString().slice(0,10);
for (const f of listing) {
  if (!f.name.endsWith(".yml")) continue;
  const doc = yaml.load(await (await fetch(f.download_url)).text());
  const roles = doc.roles || [];
  const cur = roles.find(r => r.type === "upper" && String(r.district) === "10" && (!r.end_date || r.end_date >= today) && (!r.start_date || r.start_date <= today));
  if (cur) {
    const party = (doc.party || []).find(p => !p.end_date)?.name || (doc.party?.[0]?.name);
    console.log("CA STATE SENATE District 10:");
    console.log("  name:", doc.name);
    console.log("  party:", party);
    const img = doc.image || "";
    console.log("  image:", img);
    break;
  }
}
