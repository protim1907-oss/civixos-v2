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

const ca42Leaders = [
  {
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
  },
  {
    district_code: districtCode,
    state: "California",
    district_number: 42,
    name: "Alex Padilla",
    title: "U.S. Senator",
    office_label: "California",
    party: "Democrat",
    website: "https://www.padilla.senate.gov/",
    contact_url: "https://www.padilla.senate.gov/contact/contact-form/",
    phone: "(202) 224-3553",
    image_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Alex_Padilla%2C_official_portrait%2C_117th_Congress.jpg/640px-Alex_Padilla%2C_official_portrait%2C_117th_Congress.jpg",
    is_active: true,
  },
  {
    district_code: districtCode,
    state: "California",
    district_number: 42,
    name: "Adam Schiff",
    title: "U.S. Senator",
    office_label: "California",
    party: "Democrat",
    website: "https://www.schiff.senate.gov/",
    contact_url: "https://www.schiff.senate.gov/contact/",
    phone: "(202) 224-3841",
    image_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Adam_Schiff%2C_official_portrait%2C_118th_Congress.jpg/640px-Adam_Schiff%2C_official_portrait%2C_118th_Congress.jpg",
    is_active: true,
  },
  {
    district_code: districtCode,
    state: "California",
    district_number: 42,
    name: "Gavin Newsom",
    title: "Governor of California",
    office_label: "Statewide Office",
    party: "Democrat",
    website: "https://www.gov.ca.gov/",
    contact_url: "https://www.gov.ca.gov/contact/",
    phone: "(916) 445-2841",
    image_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Gavin_Newsom_by_Gage_Skidmore.jpg/640px-Gavin_Newsom_by_Gage_Skidmore.jpg",
    is_active: true,
  },
  {
    district_code: districtCode,
    state: "California",
    district_number: 42,
    name: "Rob Bonta",
    title: "Attorney General of California",
    office_label: "Statewide Office",
    party: "Democrat",
    website: "https://oag.ca.gov/",
    contact_url: "https://oag.ca.gov/contact",
    phone: "(916) 445-9555",
    image_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Rob_Bonta_official_portrait.jpg/640px-Rob_Bonta_official_portrait.jpg",
    is_active: true,
  },
];

async function main() {
  const { error: deleteError } = await supabase
    .from("district_representatives")
    .delete()
    .eq("district_code", districtCode)
    .in("name", ca42Leaders.map((leader) => leader.name));

  if (deleteError) {
    console.error("Failed to clear existing CA-42 leader rows:", deleteError);
    process.exit(1);
  }

  const { error: insertError } = await supabase
    .from("district_representatives")
    .insert(ca42Leaders);

  if (insertError) {
    console.error("Failed to insert CA-42 leader rows:", insertError);
    process.exit(1);
  }

  console.log(`Seeded ${ca42Leaders.length} leaders for ${districtCode}.`);
}

main().catch((error) => {
  console.error("Unexpected seed error:", error);
  process.exit(1);
});
