import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { addSuppression } from "@/lib/outreach/email";

// Resend event webhook. Hard bounces and complaints auto-suppress the address
// and mark the message + lead, so we never email them again. Configure this URL
// in the Resend dashboard (Webhooks) and set RESEND_WEBHOOK_SECRET to enable the
// simple shared-secret check below.
export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (secret) {
    const provided =
      request.headers.get("x-webhook-secret") ||
      new URL(request.url).searchParams.get("secret");
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  }

  const payload = await request.json().catch(() => null);
  if (!payload) return NextResponse.json({ error: "Invalid payload." }, { status: 400 });

  const type: string = payload.type || "";
  const data = payload.data || {};
  const providerId: string | undefined = data.email_id || data.id;
  const recipients: string[] = Array.isArray(data.to) ? data.to : data.to ? [data.to] : [];

  const markMessage = async (status: string) => {
    if (!providerId) return;
    await supabaseAdmin
      .from("outreach_messages")
      .update({ status })
      .eq("provider_id", providerId);
  };

  if (type === "email.bounced" || type === "email.complained") {
    const reason = type === "email.complained" ? "complained" : "bounced";
    for (const email of recipients) await addSuppression(email, reason);
    await markMessage(type === "email.complained" ? "replied" : "bounced");
    if (recipients.length) {
      await supabaseAdmin
        .from("outreach_leads")
        .update({ status: reason === "complained" ? "unsubscribed" : "bounced" })
        .in("email", recipients.map((e) => e.toLowerCase()));
    }
  } else if (type === "email.delivered") {
    // no-op: already marked 'sent' on send; kept for completeness
  }

  return NextResponse.json({ ok: true });
}
