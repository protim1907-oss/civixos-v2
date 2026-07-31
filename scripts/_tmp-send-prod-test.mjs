import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const RECEIVER = "Protim Ghosh";

const { data: recipient } = await supabase
  .from("profiles")
  .select("id")
  .eq("full_name", RECEIVER)
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

const { data, error } = await supabase
  .from("messages")
  .insert([
    {
      sender_id: sender.id,
      sender_name: "Costa Brown",
      receiver_name: RECEIVER,
      message:
        "Live production test ✅ — if you see this pop up on civix250.ai, real-time chat notifications are working. " +
        new Date().toLocaleTimeString(),
    },
  ])
  .select()
  .single();

if (error) {
  console.error("Insert failed:", error);
  process.exit(1);
}
console.log("Sent to", RECEIVER, "— id:", data.id, "at", data.created_at);
