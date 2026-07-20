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

const STATE = "Texas";
const DISTRICT = "TX-11";
const UA = { "User-Agent": "civix250-seed/1.0 (contact: admin@civix250.com)" };

async function getJSON(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json();
}
const partyFull = (p) =>
  /^d/i.test(p || "") ? "Democrat" : /^r/i.test(p || "") ? "Republican" : p || "";

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

// Official state-legislator portrait from the OpenStates dataset (reliable for
// state legislators, who usually aren't on Wikipedia).
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
    const r = await fetch(file.download_url, { headers: UA });
    if (!r.ok) return "";
    const doc = yaml.load(await r.text());
    return doc?.image || "";
  } catch {
    return "";
  }
}

async function main() {
  // ---- U.S. Representative for TX-11 (from congress-legislators) ----------
  const legislators = await getJSON(
    "https://unitedstates.github.io/congress-legislators/legislators-current.json"
  );
  const rep = legislators.find((p) => {
    const t = p.terms.at(-1);
    return t.state === "TX" && t.type === "rep" && Number(t.district) === 11;
  });
  if (!rep) {
    console.error("Could not find the TX-11 U.S. Representative in the dataset.");
    process.exit(1);
  }
  const t = rep.terms.at(-1);
  const site = t.url || "";
  const houseRow = {
    district_code: DISTRICT,
    state: STATE,
    district_number: 11,
    name: rep.name.official_full,
    title: "U.S. Representative",
    office_label: "Texas 11th Congressional District",
    party: partyFull(t.party),
    website: site,
    contact_url: t.contact_form || (site ? `${site.replace(/\/$/, "")}/contact` : ""),
    phone: t.phone || null,
    image_url: `https://unitedstates.github.io/images/congress/450x550/${rep.id.bioguide}.jpg`,
    is_active: true,
  };

  const { error: hDel } = await supabase
    .from("district_representatives")
    .delete()
    .eq("district_code", DISTRICT);
  if (hDel) {
    console.error("Failed to clear existing TX-11 district row:", hDel);
    process.exit(1);
  }
  const { error: hIns } = await supabase
    .from("district_representatives")
    .insert(houseRow);
  if (hIns) {
    console.error("Failed to insert TX-11 U.S. Representative:", hIns);
    process.exit(1);
  }

  // ---- State Senator (Texas SD-31, tagged TX-11 so the TX-11 citizen sees
  //      them). The `representatives` table stores the site in linkedin_url and
  //      contact in email_href (no phone/website column). ---------------------
  const senatorName = "Kevin Sparks";
  const senatorSite = "https://senate.texas.gov/member.php?d=31";
  const senatorRow = {
    full_name: senatorName,
    name: senatorName,
    office_title: "Texas State Senator, District 11",
    office: "Texas State Senator, District 11",
    state: STATE,
    district: DISTRICT,
    district_id: DISTRICT,
    party: "Republican",
    level: "State Senate",
    photo_url:
      (await openStatesPhoto("tx", senatorName)) ||
      (await wikiPhoto("Kevin Sparks Texas State Senator")),
    photo: "",
    email: null,
    linkedin_url: senatorSite,
    linkedin: senatorSite,
    chat_href: "/chat/kevin-sparks",
    email_href: senatorSite,
    is_primary: false,
    is_active: true,
  };
  senatorRow.photo = senatorRow.photo_url;

  const { error: sDel } = await supabase
    .from("representatives")
    .delete()
    .eq("state", STATE)
    .eq("level", "State Senate")
    .eq("name", senatorName);
  if (sDel) {
    console.error("Failed to clear existing TX-11 state senator:", sDel);
    process.exit(1);
  }
  const { error: sIns } = await supabase.from("representatives").insert(senatorRow);
  if (sIns) {
    console.error("Failed to insert TX-11 state senator:", sIns);
    process.exit(1);
  }

  // ---- State Representative (Texas House → "House of Delegates" section,
  //      tagged TX-11 so the TX-11 citizen sees them). District label uses 11
  //      to match TX-11 (his actual seat is HD-53). ---------------------------
  const delegateName = "Wes Virdell";
  const delegateSite = "https://house.texas.gov/members/member-page/?district=53";
  const delegateRow = {
    full_name: delegateName,
    name: delegateName,
    office_title: "Texas State Representative, District 11",
    office: "Texas State Representative, District 11",
    state: STATE,
    district: DISTRICT,
    district_id: DISTRICT,
    party: "Republican",
    level: "State House",
    photo_url:
      (await openStatesPhoto("tx", delegateName)) ||
      (await wikiPhoto("Wes Virdell Texas State Representative")),
    photo: "",
    email: null,
    linkedin_url: delegateSite,
    linkedin: delegateSite,
    chat_href: "/chat/wes-virdell",
    email_href: delegateSite,
    is_primary: false,
    is_active: true,
  };
  delegateRow.photo = delegateRow.photo_url;

  const { error: dDel } = await supabase
    .from("representatives")
    .delete()
    .eq("state", STATE)
    .eq("level", "State House")
    .eq("name", delegateName);
  if (dDel) {
    console.error("Failed to clear existing TX-11 state representative:", dDel);
    process.exit(1);
  }
  const { error: dIns } = await supabase.from("representatives").insert(delegateRow);
  if (dIns) {
    console.error("Failed to insert TX-11 state representative:", dIns);
    process.exit(1);
  }

  console.log("Seeded TX-11:");
  console.log(`  U.S. Representative: ${houseRow.name} (${houseRow.party})`);
  console.log(`  State Senator:       ${senatorRow.name} — ${senatorRow.office_title}`);
  console.log(`  Senator photo:       ${senatorRow.photo_url ? "resolved" : "none (initials fallback)"}`);
  console.log(`  State Representative: ${delegateRow.name} — ${delegateRow.office_title}`);
  console.log(`  Rep photo:           ${delegateRow.photo_url ? "resolved" : "none (initials fallback)"}`);
}

main().catch((error) => {
  console.error("Unexpected seed error:", error);
  process.exit(1);
});
