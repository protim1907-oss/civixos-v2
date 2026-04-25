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
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const districtCode = "TX-35";

const tx35DistrictRepresentative = {
  district_code: districtCode,
  state: "Texas",
  district_number: 35,
  name: "Greg Casar",
  title: "U.S. Representative",
  office_label: "Texas 35th Congressional District",
  party: "Democrat",
  website: "https://casar.house.gov/",
  contact_url: "https://casar.house.gov/contact",
  phone: "(202) 225-5645",
  image_url:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Greg_Casar_118th_Congress.jpeg/640px-Greg_Casar_118th_Congress.jpeg",
  is_active: true,
};

const tx35PlatformRepresentatives = [
  {
    full_name: "Greg Casar",
    name: "Greg Casar",
    office_title: "U.S. Representative, Texas 35th District",
    office: "U.S. Representative, Texas 35th District",
    state: "Texas",
    district: districtCode,
    district_id: districtCode,
    party: "Democrat",
    photo_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Greg_Casar_118th_Congress.jpeg/640px-Greg_Casar_118th_Congress.jpeg",
    email: null,
    linkedin_url: "https://casar.house.gov/",
    level: "Congress",
    photo:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Greg_Casar_118th_Congress.jpeg/640px-Greg_Casar_118th_Congress.jpeg",
    linkedin: "https://casar.house.gov/",
    chat_href: "/chat/greg-casar",
    email_href: "https://casar.house.gov/contact",
    is_primary: true,
    is_active: true,
  },
  {
    full_name: "Ted Cruz",
    name: "Ted Cruz",
    office_title: "U.S. Senator, Texas",
    office: "U.S. Senator, Texas",
    state: "Texas",
    district: null,
    district_id: null,
    party: "Republican",
    photo_url: "https://www.cruz.senate.gov/imo/media/image/cruz_headshot.jpg",
    email: null,
    linkedin_url: "https://www.cruz.senate.gov/",
    level: "Senate",
    photo: "https://www.cruz.senate.gov/imo/media/image/cruz_headshot.jpg",
    linkedin: "https://www.cruz.senate.gov/",
    chat_href: "/chat/ted-cruz",
    email_href: "https://www.cruz.senate.gov/contact/write-ted",
    is_primary: false,
    is_active: true,
  },
  {
    full_name: "John Cornyn",
    name: "John Cornyn",
    office_title: "U.S. Senator, Texas",
    office: "U.S. Senator, Texas",
    state: "Texas",
    district: null,
    district_id: null,
    party: "Republican",
    photo_url: "",
    email: null,
    linkedin_url: "https://www.cornyn.senate.gov/",
    level: "Senate",
    photo: "",
    linkedin: "https://www.cornyn.senate.gov/",
    chat_href: "/chat/john-cornyn",
    email_href: "https://www.cornyn.senate.gov/contact/",
    is_primary: false,
    is_active: true,
  },
  {
    full_name: "Sarah Eckhardt",
    name: "Sarah Eckhardt",
    office_title: "Texas State Senator, District 14",
    office: "Texas State Senator, District 14",
    state: "Texas",
    district: districtCode,
    district_id: districtCode,
    party: "Democrat",
    photo_url: "",
    email: null,
    linkedin_url: "https://senate.texas.gov/member.php?d=14",
    level: "State Senate",
    photo: "",
    linkedin: "https://senate.texas.gov/member.php?d=14",
    chat_href: "/chat/sarah-eckhardt",
    email_href: "https://senate.texas.gov/member.php?d=14",
    is_primary: false,
    is_active: true,
  },
  {
    full_name: "Judith Zaffirini",
    name: "Judith Zaffirini",
    office_title: "Texas State Senator, District 21",
    office: "Texas State Senator, District 21",
    state: "Texas",
    district: districtCode,
    district_id: districtCode,
    party: "Democrat",
    photo_url: "",
    email: null,
    linkedin_url: "https://senate.texas.gov/member.php?d=21",
    level: "State Senate",
    photo: "",
    linkedin: "https://senate.texas.gov/member.php?d=21",
    chat_href: "/chat/judith-zaffirini",
    email_href: "https://senate.texas.gov/member.php?d=21",
    is_primary: false,
    is_active: true,
  },
  {
    full_name: "Greg Abbott",
    name: "Greg Abbott",
    office_title: "Governor of Texas",
    office: "Governor of Texas",
    state: "Texas",
    district: null,
    district_id: null,
    party: "Republican",
    photo_url:
      "https://gov.texas.gov/uploads/images/general/2024-GovernorAbbott-Portrait.jpg",
    email: null,
    linkedin_url: "https://gov.texas.gov/",
    level: "State",
    photo:
      "https://gov.texas.gov/uploads/images/general/2024-GovernorAbbott-Portrait.jpg",
    linkedin: "https://gov.texas.gov/",
    chat_href: "/chat/greg-abbott",
    email_href: "https://gov.texas.gov/apps/contact/contactus.aspx?contact=6548961",
    is_primary: false,
    is_active: true,
  },
  {
    full_name: "Ken Paxton",
    name: "Ken Paxton",
    office_title: "Attorney General of Texas",
    office: "Attorney General of Texas",
    state: "Texas",
    district: null,
    district_id: null,
    party: "Republican",
    photo_url: "",
    email: null,
    linkedin_url: "https://www.texasattorneygeneral.gov/",
    level: "State",
    photo: "",
    linkedin: "https://www.texasattorneygeneral.gov/",
    chat_href: "/chat/ken-paxton",
    email_href: "https://www.texasattorneygeneral.gov/contact-us-online-form",
    is_primary: false,
    is_active: true,
  },
];

async function main() {
  const { error: districtDeleteError } = await supabase
    .from("district_representatives")
    .delete()
    .eq("district_code", districtCode);

  if (districtDeleteError) {
    console.error("Failed to clear existing TX-35 district row:", districtDeleteError);
    process.exit(1);
  }

  const { error: districtInsertError } = await supabase
    .from("district_representatives")
    .insert(tx35DistrictRepresentative);

  if (districtInsertError) {
    console.error("Failed to insert TX-35 district row:", districtInsertError);
    process.exit(1);
  }

  const { error: representativesDeleteError } = await supabase
    .from("representatives")
    .delete()
    .eq("state", "Texas")
    .in("name", tx35PlatformRepresentatives.map((leader) => leader.name));

  if (representativesDeleteError) {
    console.error(
      "Failed to clear existing TX-35 representative rows:",
      representativesDeleteError
    );
    process.exit(1);
  }

  const { error: representativesInsertError } = await supabase
    .from("representatives")
    .insert(tx35PlatformRepresentatives);

  if (representativesInsertError) {
    console.error(
      "Failed to insert TX-35 representative rows:",
      representativesInsertError
    );
    process.exit(1);
  }

  console.log(
    `Seeded 1 district representative and ${tx35PlatformRepresentatives.length} representative records for ${districtCode}.`
  );
}

main().catch((error) => {
  console.error("Unexpected seed error:", error);
  process.exit(1);
});
