// Authoritative CA-10 U.S. House member from unitedstates congress-legislators.
const res = await fetch("https://unitedstates.github.io/congress-legislators/legislators-current.json");
const all = await res.json();
for (const p of all) {
  const t = p.terms[p.terms.length - 1];
  if (t.type === "rep" && t.state === "CA" && String(t.district) === "10") {
    console.log("US HOUSE CA-10:");
    console.log("  name:", p.name.official_full || `${p.name.first} ${p.name.last}`);
    console.log("  party:", t.party);
    console.log("  bioguide:", p.id.bioguide);
    console.log("  photo:", `https://unitedstates.github.io/images/congress/450x550/${p.id.bioguide}.jpg`);
    console.log("  url:", t.url || "");
    console.log("  phone:", t.phone || "");
    console.log("  start:", t.start, "end:", t.end);
  }
}
