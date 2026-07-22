import { createClient } from "@supabase/supabase-js";
import yaml from "js-yaml";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Run with your Supabase env loaded."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const STATE = "Nevada";
const FEATURED_DISTRICT = "NV-1"; // Las Vegas — the demo district (Dina Titus).
const UA = { "User-Agent": "civix250-seed/1.0 (contact: admin@civix250.com)" };

async function getJSON(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json();
}
async function getText(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) return null;
  return r.text();
}
const partyFull = (p) =>
  /^d/i.test(p || "") ? "Democrat" : /^r/i.test(p || "") ? "Republican" : p || "";
function ordinal(n) {
  const r100 = n % 100;
  if (r100 >= 11 && r100 <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] || "th"}`;
}
function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function congressPhoto(bioguide) {
  return `https://unitedstates.github.io/images/congress/450x550/${bioguide}.jpg`;
}

// A `representatives` row. The table has no website/phone column — the official
// site goes in linkedin_url and the contact page in email_href.
function representative({ name, office, level, website, contact, party, photo, district = null }) {
  const slug = slugify(name);
  return {
    full_name: name,
    name,
    office_title: office,
    office,
    state: STATE,
    district,
    district_id: district,
    party,
    level,
    photo_url: photo || "",
    photo: photo || "",
    email: null,
    linkedin_url: website || "",
    linkedin: website || "",
    chat_href: `/chat/${slug}`,
    email_href: contact || website || "",
    is_primary: false,
    is_active: true,
  };
}

async function wikiPhoto(query) {
  try {
    const url =
      "https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=thumbnail&pithumbsize=500" +
      `&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=1`;
    const data = await getJSON(url);
    const first = Object.values(data?.query?.pages || {})[0];
    return first?.thumbnail?.source || "";
  } catch {
    return "";
  }
}

// Official state-legislator portrait from the OpenStates dataset.
async function openStatesPhoto(stateAbbr, fullName) {
  try {
    const slug = fullName.replace(/\s+/g, "-");
    const list = await getJSON(
      `https://api.github.com/repos/openstates/people/contents/data/${stateAbbr}/legislature`
    );
    const file = (Array.isArray(list) ? list : []).find((f) =>
      new RegExp(`^${slug}-`, "i").test(f.name || "")
    );
    if (!file) return "";
    const txt = await getText(file.download_url);
    const doc = txt ? yaml.load(txt) : null;
    return doc?.image || "";
  } catch {
    return "";
  }
}

async function main() {
  // ---- 1. Federal delegation from congress-legislators --------------------
  const legislators = await getJSON(
    "https://unitedstates.github.io/congress-legislators/legislators-current.json"
  );
  const nvFederal = legislators.filter((p) => p.terms.at(-1).state === "NV");

  const houseDelegation = nvFederal
    .filter((p) => p.terms.at(-1).type === "rep")
    .map((p) => {
      const t = p.terms.at(-1);
      const num = Number(t.district);
      const site = t.url || "";
      return {
        district_code: `NV-${num}`,
        state: STATE,
        district_number: num,
        name: p.name.official_full,
        title: "U.S. Representative",
        office_label: `Nevada ${ordinal(num)} Congressional District`,
        party: partyFull(t.party),
        website: site,
        contact_url: t.contact_form || (site ? `${site.replace(/\/$/, "")}/contact` : ""),
        phone: t.phone || null,
        image_url: congressPhoto(p.id.bioguide),
        is_active: true,
      };
    })
    .sort((a, b) => a.district_number - b.district_number);

  const usSenators = nvFederal
    .filter((p) => p.terms.at(-1).type === "sen")
    .map((p) => {
      const t = p.terms.at(-1);
      return representative({
        name: p.name.official_full,
        office: "U.S. Senator, Nevada",
        level: "senate",
        website: t.url,
        contact: t.contact_form || t.url,
        party: partyFull(t.party),
        photo: congressPhoto(p.id.bioguide),
      });
    });

  // ---- 2. Statewide executives (Wikipedia headshots) ----------------------
  const execDefs = [
    { name: "Joe Lombardo", office: "Governor of Nevada", party: "Republican", website: "https://gov.nv.gov", contact: "https://gov.nv.gov/Contact/Email_the_Governor/", q: "Joe Lombardo Governor Nevada" },
    { name: "Aaron D. Ford", office: "Attorney General of Nevada", party: "Democrat", website: "https://ag.nv.gov", contact: "https://ag.nv.gov/About/Contact_the_AG/", q: "Aaron Ford Nevada Attorney General" },
    { name: "Cisco Aguilar", office: "Secretary of State of Nevada", party: "Democrat", website: "https://www.nvsos.gov", contact: "https://www.nvsos.gov/sos/contact-us", q: "Cisco Aguilar Nevada Secretary of State" },
    { name: "Zach Conine", office: "Treasurer of Nevada", party: "Democrat", website: "https://www.nevadatreasurer.gov", contact: "https://www.nevadatreasurer.gov/Contact_Us/", q: "Zach Conine Nevada Treasurer" },
  ];
  const execs = [];
  for (const d of execDefs) {
    execs.push(
      representative({
        name: d.name,
        office: d.office,
        level: "State",
        website: d.website,
        contact: d.contact,
        party: d.party,
        photo: await wikiPhoto(d.q),
      })
    );
  }

  // ---- 3. Featured NV-1 (Las Vegas) state legislators, tagged to the
  //         congressional district — the same shape as TX-3. Titles omit the
  //         chamber-district number to avoid confusion with NV-1. -------------
  const senatorName = "Dallas Harris";
  const stateSenator = representative({
    name: senatorName,
    office: "Nevada State Senator",
    level: "State Senate",
    website: "https://www.leg.state.nv.us/App/Legislator/A/Senate/Current",
    contact: "https://www.leg.state.nv.us/App/Legislator/A/Senate/Current",
    party: "Democrat",
    photo:
      (await openStatesPhoto("nv", senatorName)) ||
      (await wikiPhoto("Dallas Harris Nevada State Senator")),
    district: FEATURED_DISTRICT,
  });

  const assemblyName = "Steve Yeager";
  const stateAssembly = representative({
    name: assemblyName,
    office: "Nevada State Assembly Member",
    level: "State House",
    website: "https://www.leg.state.nv.us/App/Legislator/A/Assembly/Current",
    contact: "https://www.leg.state.nv.us/App/Legislator/A/Assembly/Current",
    party: "Democrat",
    photo:
      (await openStatesPhoto("nv", assemblyName)) ||
      (await wikiPhoto("Steve Yeager Nevada Assembly")),
    district: FEATURED_DISTRICT,
  });

  // ---- Write to Supabase (idempotent: clear NV rows, then insert) ---------
  const representativesRows = [...usSenators, ...execs, stateSenator, stateAssembly];

  const { error: repDeleteError } = await supabase
    .from("representatives")
    .delete()
    .eq("state", STATE);
  if (repDeleteError) {
    console.error("Failed to clear NV representatives:", repDeleteError);
    process.exit(1);
  }
  const { error: repInsertError } = await supabase
    .from("representatives")
    .insert(representativesRows);
  if (repInsertError) {
    console.error("Failed to insert NV representatives:", repInsertError);
    process.exit(1);
  }

  const { error: houseDeleteError } = await supabase
    .from("district_representatives")
    .delete()
    .eq("state", STATE);
  if (houseDeleteError) {
    console.error("Failed to clear NV district representatives:", houseDeleteError);
    process.exit(1);
  }
  const { error: houseInsertError } = await supabase
    .from("district_representatives")
    .insert(houseDelegation);
  if (houseInsertError) {
    console.error("Failed to insert NV district representatives:", houseInsertError);
    process.exit(1);
  }

  const missingPhotos = representativesRows.filter((r) => !r.photo).map((r) => r.name);
  console.log(
    `Seeded Nevada: ${usSenators.length} U.S. senators, ${execs.length} statewide execs, ` +
      `${houseDelegation.length} U.S. House members, plus NV-1 state senator + assembly member.`
  );
  console.log(`  U.S. House: ${houseDelegation.map((h) => `${h.district_code} ${h.name}`).join(", ")}`);
  if (missingPhotos.length) {
    console.log(`  No photo resolved for: ${missingPhotos.join(", ")}`);
  }
}

main().catch((error) => {
  console.error("Unexpected seed error:", error);
  process.exit(1);
});
