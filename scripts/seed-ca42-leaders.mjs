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

const districtCode = "CA-42";

const ca42DistrictRepresentative = {
  district_code: districtCode,
  state: "California",
  district_number: 42,
  name: "Robert Garcia",
  title: "U.S. Representative",
  office_label: "CA-42",
  party: "Democrat",
  website: "https://robertgarcia.house.gov/",
  contact_url: "https://robertgarcia.house.gov/contact",
  phone: "(202) 225-7924",
  image_url: "",
  is_active: true,
};

const ca42PlatformRepresentatives = [
  {
    full_name: "Robert Garcia",
    name: "Robert Garcia",
    office_title: "U.S. Representative, California 42nd District",
    office: "U.S. Representative, California 42nd District",
    state: "California",
    district: districtCode,
    district_id: districtCode,
    party: "Democrat",
    photo_url: "",
    email: null,
    linkedin_url: "https://robertgarcia.house.gov/",
    level: "Congress",
    photo: "",
    linkedin: "https://robertgarcia.house.gov/",
    chat_href: "/chat/robert-garcia",
    email_href: "https://robertgarcia.house.gov/contact",
    is_primary: true,
    is_active: true,
  },
  {
    full_name: "Alex Padilla",
    name: "Alex Padilla",
    office_title: "U.S. Senator, California",
    office: "U.S. Senator, California",
    state: "California",
    district: null,
    district_id: null,
    party: "Democrat",
    photo_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Alex_Padilla%2C_official_portrait%2C_117th_Congress.jpg/640px-Alex_Padilla%2C_official_portrait%2C_117th_Congress.jpg",
    email: null,
    linkedin_url: "https://www.padilla.senate.gov/",
    level: "Senate",
    photo:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Alex_Padilla%2C_official_portrait%2C_117th_Congress.jpg/640px-Alex_Padilla%2C_official_portrait%2C_117th_Congress.jpg",
    linkedin: "https://www.padilla.senate.gov/",
    chat_href: "/chat/alex-padilla",
    email_href: "https://www.padilla.senate.gov/contact/contact-form/",
    is_primary: false,
    is_active: true,
  },
  {
    full_name: "Adam Schiff",
    name: "Adam Schiff",
    office_title: "U.S. Senator, California",
    office: "U.S. Senator, California",
    state: "California",
    district: null,
    district_id: null,
    party: "Democrat",
    photo_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Adam_Schiff%2C_official_portrait%2C_118th_Congress.jpg/640px-Adam_Schiff%2C_official_portrait%2C_118th_Congress.jpg",
    email: null,
    linkedin_url: "https://www.schiff.senate.gov/",
    level: "Senate",
    photo:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Adam_Schiff%2C_official_portrait%2C_118th_Congress.jpg/640px-Adam_Schiff%2C_official_portrait%2C_118th_Congress.jpg",
    linkedin: "https://www.schiff.senate.gov/",
    chat_href: "/chat/adam-schiff",
    email_href: "https://www.schiff.senate.gov/contact/",
    is_primary: false,
    is_active: true,
  },
  {
    full_name: "Lena Gonzalez",
    name: "Lena Gonzalez",
    office_title: "California State Senator, District 33",
    office: "California State Senator, District 33",
    state: "California",
    district: districtCode,
    district_id: districtCode,
    party: "Democrat",
    photo_url: "",
    email: null,
    linkedin_url: "https://sd33.senate.ca.gov/",
    level: "State Senate",
    photo: "",
    linkedin: "https://sd33.senate.ca.gov/",
    chat_href: "/chat/lena-gonzalez",
    email_href: "https://sd33.senate.ca.gov/contact",
    is_primary: false,
    is_active: true,
  },
  {
    full_name: "Gavin Newsom",
    name: "Gavin Newsom",
    office_title: "Governor of California",
    office: "Governor of California",
    state: "California",
    district: null,
    district_id: null,
    party: "Democrat",
    photo_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Gavin_Newsom_by_Gage_Skidmore.jpg/640px-Gavin_Newsom_by_Gage_Skidmore.jpg",
    email: null,
    linkedin_url: "https://www.gov.ca.gov/",
    level: "State",
    photo:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Gavin_Newsom_by_Gage_Skidmore.jpg/640px-Gavin_Newsom_by_Gage_Skidmore.jpg",
    linkedin: "https://www.gov.ca.gov/",
    chat_href: "/chat/gavin-newsom",
    email_href: "https://www.gov.ca.gov/contact/",
    is_primary: false,
    is_active: true,
  },
  {
    full_name: "Rob Bonta",
    name: "Rob Bonta",
    office_title: "Attorney General of California",
    office: "Attorney General of California",
    state: "California",
    district: null,
    district_id: null,
    party: "Democrat",
    photo_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Rob_Bonta_official_portrait.jpg/640px-Rob_Bonta_official_portrait.jpg",
    email: null,
    linkedin_url: "https://oag.ca.gov/",
    level: "State",
    photo:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Rob_Bonta_official_portrait.jpg/640px-Rob_Bonta_official_portrait.jpg",
    linkedin: "https://oag.ca.gov/",
    chat_href: "/chat/rob-bonta",
    email_href: "https://oag.ca.gov/contact",
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
    console.error("Failed to clear existing CA-42 district row:", districtDeleteError);
    process.exit(1);
  }

  const { error: districtInsertError } = await supabase
    .from("district_representatives")
    .insert(ca42DistrictRepresentative);

  if (districtInsertError) {
    console.error("Failed to insert CA-42 district row:", districtInsertError);
    process.exit(1);
  }

  const { error: representativesDeleteError } = await supabase
    .from("representatives")
    .delete()
    .eq("state", "California")
    .in("name", ca42PlatformRepresentatives.map((leader) => leader.name));

  if (representativesDeleteError) {
    console.error(
      "Failed to clear existing CA-42 representative rows:",
      representativesDeleteError
    );
    process.exit(1);
  }

  const { error: representativesInsertError } = await supabase
    .from("representatives")
    .insert(ca42PlatformRepresentatives);

  if (representativesInsertError) {
    console.error(
      "Failed to insert CA-42 representative rows:",
      representativesInsertError
    );
    process.exit(1);
  }

  console.log(
    `Seeded 1 district representative and ${ca42PlatformRepresentatives.length} representative records for ${districtCode}.`
  );
}

main().catch((error) => {
  console.error("Unexpected seed error:", error);
  process.exit(1);
});
