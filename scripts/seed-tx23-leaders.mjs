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

const STATE = "Texas";
const DISTRICT = "TX-23";

// Add Mark Dorazio (Texas State Representative, HD-122, San Antonio) to the
// TX-23 congressional district — the State House card ("House of Delegates"
// section), tagged TX-23 like the district's state senators. Title keeps his
// real chamber district (122), matching how the TX-23 senators are labelled.
const NAME = "Mark Dorazio";
const SITE = "https://house.texas.gov/members/member-page/?district=122";
// Wikimedia Commons portrait (the Texas House image host blocks hotlinking).
const PHOTO =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Mark_Dorazio_by_Gage_Skidmore.jpg/330px-Mark_Dorazio_by_Gage_Skidmore.jpg";

async function main() {
  const row = {
    full_name: NAME,
    name: NAME,
    office_title: "Texas State Representative, District 122",
    office: "Texas State Representative, District 122",
    state: STATE,
    district: DISTRICT,
    district_id: DISTRICT,
    party: "Republican",
    level: "State House",
    photo_url: PHOTO,
    photo: PHOTO,
    email: null,
    linkedin_url: SITE,
    linkedin: SITE,
    chat_href: "/chat/mark-dorazio",
    email_href: SITE,
    is_primary: false,
    is_active: true,
  };

  const { error: delErr } = await supabase
    .from("representatives")
    .delete()
    .eq("state", STATE)
    .eq("level", "State House")
    .eq("name", NAME);
  if (delErr) {
    console.error("Failed to clear existing Mark Dorazio row:", delErr);
    process.exit(1);
  }

  const { error: insErr } = await supabase.from("representatives").insert(row);
  if (insErr) {
    console.error("Failed to insert Mark Dorazio:", insErr);
    process.exit(1);
  }

  console.log(`Added ${NAME} — ${row.office_title} — tagged ${DISTRICT} (House of Delegates).`);
}

main().catch((error) => {
  console.error("Unexpected seed error:", error);
  process.exit(1);
});
