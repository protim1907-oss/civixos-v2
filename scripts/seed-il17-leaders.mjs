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

const STATE = "Illinois";
const DISTRICT = "IL-17";
const DISTRICT_NUMBER = 17;
const UA = { "User-Agent": "civix250-seed/1.0 (contact: admin@civix250.com)" };

async function getJSON(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json();
}
const partyFull = (p) =>
  /^d/i.test(p || "") ? "Democrat" : /^r/i.test(p || "") ? "Republican" : p || "";

async function main() {
  // ---- U.S. Representative for IL-17 (from congress-legislators) -----------
  // This replaces the mis-seeded state-senator row that was sitting in the
  // district_representatives slot, so the assigned district card becomes the
  // U.S. House member — the same shape as TX-3 (Keith Self).
  const legislators = await getJSON(
    "https://unitedstates.github.io/congress-legislators/legislators-current.json"
  );
  const rep = legislators.find((p) => {
    const t = p.terms.at(-1);
    return t.state === "IL" && t.type === "rep" && Number(t.district) === DISTRICT_NUMBER;
  });
  if (!rep) {
    console.error("Could not find the IL-17 U.S. Representative in the dataset.");
    process.exit(1);
  }
  const t = rep.terms.at(-1);
  const site = t.url || "";
  const houseRow = {
    district_code: DISTRICT,
    state: STATE,
    district_number: DISTRICT_NUMBER,
    name: rep.name.official_full,
    title: "U.S. Representative",
    office_label: "Illinois's 17th Congressional District",
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
    console.error("Failed to clear existing IL-17 district row:", hDel);
    process.exit(1);
  }
  const { error: hIns } = await supabase
    .from("district_representatives")
    .insert(houseRow);
  if (hIns) {
    console.error("Failed to insert IL-17 U.S. Representative:", hIns);
    process.exit(1);
  }

  // ---- Demote existing IL-17 state senators so the U.S. Representative owns
  //      the assigned district card (TX-3 parity: no state legislator is the
  //      is_primary owner). The senators still render in the State Senate
  //      section. -------------------------------------------------------------
  const { error: demoteErr } = await supabase
    .from("representatives")
    .update({ is_primary: false })
    .eq("state", STATE)
    .eq("level", "State Senate")
    .eq("district", DISTRICT);
  if (demoteErr) {
    console.error("Failed to demote IL-17 state senators:", demoteErr);
    process.exit(1);
  }

  // ---- State Representative (Illinois House → "House of Delegates" section,
  //      tagged IL-17). Illinois keeps the real chamber district in the label
  //      (HD-67, Rockford) while tagging the congressional district. ----------
  const delegateName = "Maurice A. West II";
  const delegateSite = "https://www.ilhousedems.com/west";
  // Official House Democrats portrait (Wikipedia has no free image for him).
  const delegatePhoto =
    "https://ilhousedems.com/wp-content/uploads/2019/02/West-214x300.jpg";
  const delegateRow = {
    full_name: delegateName,
    name: delegateName,
    office_title: "Illinois State Representative",
    office: "Illinois State Representative",
    state: STATE,
    district: DISTRICT,
    district_id: DISTRICT,
    party: "Democrat",
    level: "State House",
    photo_url: delegatePhoto,
    photo: "",
    email: null,
    linkedin_url: delegateSite,
    linkedin: delegateSite,
    chat_href: "/chat/maurice-west",
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
    console.error("Failed to clear existing IL-17 state representative:", dDel);
    process.exit(1);
  }
  const { error: dIns } = await supabase.from("representatives").insert(delegateRow);
  if (dIns) {
    console.error("Failed to insert IL-17 state representative:", dIns);
    process.exit(1);
  }

  console.log("Seeded IL-17:");
  console.log(`  U.S. Representative: ${houseRow.name} (${houseRow.party})`);
  console.log(`  State Senators:      demoted to is_primary=false (U.S. Rep owns the card)`);
  console.log(`  State Representative: ${delegateRow.name} — ${delegateRow.office_title}`);
  console.log(`  Rep photo:           ${delegateRow.photo_url ? "resolved" : "none (initials fallback)"}`);
}

main().catch((error) => {
  console.error("Unexpected seed error:", error);
  process.exit(1);
});
