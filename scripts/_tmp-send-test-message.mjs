import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Find any real user other than the recipient to satisfy the sender_id FK.
const { data: recipient } = await supabase
  .from("profiles")
  .select("id")
  .eq("full_name", "IL Demo Citizen 10")
  .maybeSingle();

const { data: senders } = await supabase
  .from("profiles")
  .select("id, full_name")
  .neq("id", recipient?.id || "00000000-0000-0000-0000-000000000000")
  .limit(1);

const sender = senders?.[0];
if (!sender) {
  console.error("No sender profile found");
  process.exit(1);
}
console.log("Using sender:", sender.full_name, sender.id);

const { data, error } = await supabase
  .from("messages")
  .insert([
    {
      sender_id: sender.id,
      sender_name: "Costa Brown",
      receiver_name: "IL Demo Citizen 10",
      message: "Realtime test — you should see a toast now! " + new Date().toLocaleTimeString(),
    },
  ])
  .select()
  .single();

if (error) {
  console.error("Insert failed:", error);
  process.exit(1);
}
console.log("Inserted message id:", data.id, "at", data.created_at);
