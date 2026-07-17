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

const STATE = "Colorado";
const TODAY = new Date().toISOString().slice(0, 10);
const UA = { "User-Agent": "civix250-seed/1.0 (contact: admin@civix250.com)" };

async function getJSON(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json();
}
async function getText(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.text();
}

function partyFull(p) {
  const v = String(p || "").toLowerCase();
  if (v.startsWith("d")) return "Democrat";
  if (v.startsWith("r")) return "Republican";
  return p || "";
}
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

// Resolve a Wikipedia headshot via search -> pageimages (robust to exact titles).
async function wikiPhoto(query) {
  try {
    const url =
      "https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=thumbnail&pithumbsize=500" +
      `&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=1`;
    const data = await getJSON(url);
    const pages = data?.query?.pages || {};
    const first = Object.values(pages)[0];
    return first?.thumbnail?.source || "";
  } catch {
    return "";
  }
}

async function mapLimit(items, limit, fn) {
  const out = [];
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit);
    out.push(...(await Promise.all(batch.map(fn))));
  }
  return out;
}

async function main() {
  // ---- 1. Federal delegation from congress-legislators -------------------
  const legislators = await getJSON(
    "https://unitedstates.github.io/congress-legislators/legislators-current.json"
  );
  const coFederal = legislators.filter((p) => p.terms.at(-1).state === "CO");

  const houseDelegation = coFederal
    .filter((p) => p.terms.at(-1).type === "rep")
    .map((p) => {
      const t = p.terms.at(-1);
      const num = Number(t.district);
      const site = t.url || "";
      return {
        district_code: `CO-${num}`,
        state: STATE,
        district_number: num,
        name: p.name.official_full,
        title: "U.S. Representative",
        office_label: `Colorado ${ordinal(num)} Congressional District`,
        party: partyFull(t.party),
        website: site,
        contact_url: t.contact_form || (site ? `${site.replace(/\/$/, "")}/contact` : ""),
        phone: t.phone || null,
        image_url: congressPhoto(p.id.bioguide),
        is_active: true,
      };
    })
    .sort((a, b) => a.district_number - b.district_number);

  const usSenators = coFederal
    .filter((p) => p.terms.at(-1).type === "sen")
    .map((p) => {
      const t = p.terms.at(-1);
      return representative({
        name: p.name.official_full,
        office: "U.S. Senator, Colorado",
        level: "senate",
        website: t.url,
        contact: t.contact_form || t.url,
        party: partyFull(t.party),
        photo: congressPhoto(p.id.bioguide),
      });
    });

  // ---- 2. Statewide executives (Wikipedia headshots) ---------------------
  const execDefs = [
    { name: "Jared Polis", office: "Governor of Colorado", website: "https://www.colorado.gov/governor", contact: "https://www.colorado.gov/governor/contact-governor", q: "Jared Polis Governor Colorado" },
    { name: "Phil Weiser", office: "Attorney General of Colorado", website: "https://coag.gov", contact: "https://coag.gov/contact-us/", q: "Phil Weiser Colorado Attorney General" },
    { name: "Jena Griswold", office: "Secretary of State of Colorado", website: "https://www.coloradosos.gov", contact: "https://www.coloradosos.gov/pubs/contactUs.html", q: "Jena Griswold Colorado Secretary of State" },
    { name: "Dave Young", office: "Treasurer of Colorado", website: "https://treasury.colorado.gov", contact: "https://treasury.colorado.gov/contact-us", q: "Dave Young Colorado Treasurer" },
  ];
  const execs = await mapLimit(execDefs, 4, async (d) =>
    representative({
      name: d.name,
      office: d.office,
      level: "State",
      website: d.website,
      contact: d.contact,
      party: "Democrat",
      photo: await wikiPhoto(d.q),
    })
  );

  // ---- 3. Current State Senators from OpenStates -------------------------
  const files = (
    await getJSON(
      "https://api.github.com/repos/openstates/people/contents/data/co/legislature"
    )
  ).filter((f) => f.name.endsWith(".yml"));

  const docs = await mapLimit(files, 10, async (f) => {
    try {
      return yaml.load(await getText(f.download_url));
    } catch {
      return null;
    }
  });

  const stateSenators = [];
  for (const doc of docs) {
    if (!doc) continue;
    const upperRoles = (doc.roles || []).filter((r) => r.type === "upper");
    // js-yaml parses unquoted YAML dates as Date objects — normalize to
    // YYYY-MM-DD strings before comparing.
    const asDateStr = (v) =>
      v instanceof Date ? v.toISOString().slice(0, 10) : v ? String(v) : "";
    // A current senator has an upper role active today.
    const current = upperRoles.find((r) => {
      const start = asDateStr(r.start_date);
      const end = asDateStr(r.end_date);
      return (!start || start <= TODAY) && (!end || end >= TODAY);
    });
    if (!current) continue;
    const num = Number(current.district);
    const partyEntry =
      (doc.party || []).find((p) => !p.end_date) || (doc.party || []).at(-1);
    const homepage = (doc.links || []).find((l) => l.note === "homepage")?.url;
    stateSenators.push(
      representative({
        name: doc.name,
        office: `Colorado State Senator, District ${num}`,
        level: "State Senate",
        website: homepage || "",
        contact: homepage || "",
        party: partyFull(partyEntry?.name),
        photo: doc.image || "",
        district: `CO-${num}`,
      })
    );
  }
  stateSenators.sort(
    (a, b) => Number(a.district.split("-")[1]) - Number(b.district.split("-")[1])
  );

  // ---- Write to Supabase (idempotent: clear CO rows, then insert) --------
  const representativesRows = [...usSenators, ...execs, ...stateSenators];

  const { error: repDeleteError } = await supabase
    .from("representatives")
    .delete()
    .eq("state", STATE);
  if (repDeleteError) {
    console.error("Failed to clear CO representatives:", repDeleteError);
    process.exit(1);
  }
  const { error: repInsertError } = await supabase
    .from("representatives")
    .insert(representativesRows);
  if (repInsertError) {
    console.error("Failed to insert CO representatives:", repInsertError);
    process.exit(1);
  }

  const { error: houseDeleteError } = await supabase
    .from("district_representatives")
    .delete()
    .eq("state", STATE);
  if (houseDeleteError) {
    console.error("Failed to clear CO district representatives:", houseDeleteError);
    process.exit(1);
  }
  const { error: houseInsertError } = await supabase
    .from("district_representatives")
    .insert(houseDelegation);
  if (houseInsertError) {
    console.error("Failed to insert CO district representatives:", houseInsertError);
    process.exit(1);
  }

  const missingPhotos = representativesRows.filter((r) => !r.photo).map((r) => r.name);
  console.log(
    `Seeded Colorado: ${usSenators.length} U.S. senators, ${execs.length} statewide execs, ` +
      `${stateSenators.length} state senators, ${houseDelegation.length} U.S. House members.`
  );
  if (missingPhotos.length) {
    console.log(`No photo resolved for: ${missingPhotos.join(", ")}`);
  }
}

main().catch((error) => {
  console.error("Unexpected seed error:", error);
  process.exit(1);
});
