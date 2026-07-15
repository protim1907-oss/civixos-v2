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

const DEMO = {
  email: "md1.demo@civix250.com",
  password: "MD1-Demo-2026!",
  full_name: "MD Demo Citizen",
  role: "citizen",
  district: "MD-1",
  state: "Maryland",
  street_address: "100 Main St",
  city: "Salisbury",
  zip_code: "21801",
};

async function main() {
  // 1) Create (or find) the auth user with a confirmed email so it can log in.
  let userId = null;

  const { data: created, error: createError } =
    await supabase.auth.admin.createUser({
      email: DEMO.email,
      password: DEMO.password,
      email_confirm: true,
      user_metadata: {
        full_name: DEMO.full_name,
        state: DEMO.state,
        district: DEMO.district,
        role: DEMO.role,
      },
    });

  if (createError) {
    const msg = createError.message.toLowerCase();
    if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
      // Look the user up and reset the password so the demo creds always work.
      const { data: list, error: listError } =
        await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (listError) {
        console.error("Failed to list users:", listError);
        process.exit(1);
      }
      const existing = list.users.find(
        (u) => (u.email || "").toLowerCase() === DEMO.email
      );
      if (!existing) {
        console.error("User reported as existing but not found in listUsers.");
        process.exit(1);
      }
      userId = existing.id;
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        { password: DEMO.password, email_confirm: true }
      );
      if (updateError) {
        console.error("Failed to reset existing user password:", updateError);
        process.exit(1);
      }
      console.log("User already existed — password reset to the demo value.");
    } else {
      console.error("Failed to create auth user:", createError);
      process.exit(1);
    }
  } else {
    userId = created.user.id;
    console.log("Created auth user:", userId);
  }

  // 2) Upsert the profile row (district gate must allow MD — see
  //    sql/allow-maryland-district.sql).
  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      full_name: DEMO.full_name,
      email: DEMO.email,
      role: DEMO.role,
      district: DEMO.district,
      state: DEMO.state,
      street_address: DEMO.street_address,
      city: DEMO.city,
      zip_code: DEMO.zip_code,
    },
    { onConflict: "id" }
  );

  if (profileError) {
    console.error("Failed to upsert profile:", profileError);
    console.error(
      "If this is a check_violation on district, run sql/allow-maryland-district.sql first."
    );
    process.exit(1);
  }

  console.log("\nMD-1 demo account ready:");
  console.log("  Email:    " + DEMO.email);
  console.log("  Password: " + DEMO.password);
  console.log("  District: " + DEMO.district);
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
