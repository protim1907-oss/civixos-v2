import { createClient } from "@supabase/supabase-js";

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

const STATE = "Ohio";
// Ohio districts are unpadded (OH-1 .. OH-15), matching TX/IL.
const FEATURED_DISTRICT = "OH-11"; // Cleveland — the demo district (Shontel Brown).
const UA = { "User-Agent": "civix250-seed/1.0 (contact: admin@civix250.com)" };

async function getJSON(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json();
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

async function main() {
  // ---- 1. Federal delegation from congress-legislators --------------------
  const legislators = await getJSON(
    "https://unitedstates.github.io/congress-legislators/legislators-current.json"
  );
  const ohFederal = legislators.filter((p) => p.terms.at(-1).state === "OH");

  const houseDelegation = ohFederal
    .filter((p) => p.terms.at(-1).type === "rep")
    .map((p) => {
      const t = p.terms.at(-1);
      const num = Number(t.district);
      const site = t.url || "";
      return {
        district_code: `OH-${num}`,
        state: STATE,
        district_number: num,
        name: p.name.official_full,
        title: "U.S. Representative",
        office_label: `Ohio ${ordinal(num)} Congressional District`,
        party: partyFull(t.party),
        website: site,
        contact_url: t.contact_form || (site ? `${site.replace(/\/$/, "")}/contact` : ""),
        phone: t.phone || null,
        image_url: congressPhoto(p.id.bioguide),
        is_active: true,
      };
    })
    .sort((a, b) => a.district_number - b.district_number);

  const usSenators = ohFederal
    .filter((p) => p.terms.at(-1).type === "sen")
    .map((p) => {
      const t = p.terms.at(-1);
      return representative({
        name: p.name.official_full,
        office: "U.S. Senator, Ohio",
        level: "senate",
        website: t.url,
        contact: t.contact_form || t.url,
        party: partyFull(t.party),
        photo: congressPhoto(p.id.bioguide),
      });
    });

  // ---- 2. Statewide executives (Wikipedia headshots) ----------------------
  const execDefs = [
    { name: "Mike DeWine", office: "Governor of Ohio", party: "Republican", website: "https://governor.ohio.gov", contact: "https://governor.ohio.gov/contact", q: "Mike DeWine Governor Ohio" },
    { name: "Dave Yost", office: "Attorney General of Ohio", party: "Republican", website: "https://www.ohioattorneygeneral.gov", contact: "https://www.ohioattorneygeneral.gov/About-AG/Contact", q: "Dave Yost Ohio Attorney General" },
    { name: "Frank LaRose", office: "Secretary of State of Ohio", party: "Republican", website: "https://www.ohiosos.gov", contact: "https://www.ohiosos.gov/secretary-office/contact-us/", q: "Frank LaRose Ohio Secretary of State" },
    { name: "Robert Sprague", office: "Treasurer of Ohio", party: "Republican", website: "https://tos.ohio.gov", contact: "https://tos.ohio.gov/contact/", q: "Robert Sprague Ohio Treasurer" },
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

  // ---- 3. Featured OH-11 (Cleveland) state legislators, tagged to the
  //         congressional district — the same shape as IL-17. Titles omit the
  //         chamber-district number to avoid confusion with OH-11. Photos are
  //         verified Wikimedia Commons images (the legislature.ohio.gov headshot
  //         host blocks hotlinking). --------------------------------------------
  const stateSenator = representative({
    name: "Vernon Sykes",
    office: "Ohio State Senator",
    level: "State Senate",
    website: "https://ohiosenate.gov/members/vernon-sykes",
    contact: "https://ohiosenate.gov/members/vernon-sykes/contact",
    party: "Democrat",
    photo:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Vernon_Sykes%2C_April_2024.jpg/330px-Vernon_Sykes%2C_April_2024.jpg",
    district: FEATURED_DISTRICT,
  });

  const stateRep = representative({
    name: "Juanita Brent",
    office: "Ohio State Representative",
    level: "State House",
    website: "https://ohiohouse.gov/members/juanita-brent",
    contact: "https://ohiohouse.gov/members/juanita-brent/contact",
    party: "Democrat",
    photo:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Juanita_Brent.jpg/330px-Juanita_Brent.jpg",
    district: FEATURED_DISTRICT,
  });

  // ---- Write to Supabase (idempotent: clear OH rows, then insert) ---------
  const representativesRows = [...usSenators, ...execs, stateSenator, stateRep];

  const { error: repDeleteError } = await supabase
    .from("representatives")
    .delete()
    .eq("state", STATE);
  if (repDeleteError) {
    console.error("Failed to clear OH representatives:", repDeleteError);
    process.exit(1);
  }
  const { error: repInsertError } = await supabase
    .from("representatives")
    .insert(representativesRows);
  if (repInsertError) {
    console.error("Failed to insert OH representatives:", repInsertError);
    process.exit(1);
  }

  const { error: houseDeleteError } = await supabase
    .from("district_representatives")
    .delete()
    .eq("state", STATE);
  if (houseDeleteError) {
    console.error("Failed to clear OH district representatives:", houseDeleteError);
    process.exit(1);
  }
  const { error: houseInsertError } = await supabase
    .from("district_representatives")
    .insert(houseDelegation);
  if (houseInsertError) {
    console.error("Failed to insert OH district representatives:", houseInsertError);
    process.exit(1);
  }

  const missingPhotos = representativesRows.filter((r) => !r.photo).map((r) => r.name);
  console.log(
    `Seeded Ohio: ${usSenators.length} U.S. senators, ${execs.length} statewide execs, ` +
      `${houseDelegation.length} U.S. House members, plus OH-11 state senator + representative.`
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
