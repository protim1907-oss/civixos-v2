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
  email: "tx11.demo@civix250.com",
  password: "TX11-Demo-2026!",
  full_name: "TX Demo Citizen",
  role: "citizen",
  district: "TX-11",
  state: "Texas",
  street_address: "72 W College Ave",
  city: "San Angelo",
  zip_code: "76903",
};

async function main() {
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
    process.exit(1);
  }

  console.log("\nTX-11 demo account ready:");
  console.log("  Email:    " + DEMO.email);
  console.log("  Password: " + DEMO.password);
  console.log("  District: " + DEMO.district);
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
