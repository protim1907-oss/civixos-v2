import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { addSuppression, verifyUnsubToken } from "@/lib/outreach/email";

// Public endpoint — no auth. The token in the link is what authorizes the
// unsubscribe, so it can't be used to suppress arbitrary addresses.
async function unsubscribe(email: string, token: string) {
  const clean = email.trim().toLowerCase();
  if (!clean || !verifyUnsubToken(clean, token)) return false;

  await addSuppression(clean, "unsubscribed");
  await supabaseAdmin
    .from("outreach_leads")
    .update({ status: "unsubscribed" })
    .eq("email", clean);
  return true;
}

function page(message: string) {
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:80px auto;padding:0 20px;color:#1f2937;text-align:center;">
<h1 style="font-size:20px;">Civix250</h1><p style="font-size:15px;color:#374151;">${message}</p></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

// One-click unsubscribe (RFC 8058) sends a POST; browsers hit the GET link.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const ok = await unsubscribe(url.searchParams.get("e") || "", url.searchParams.get("t") || "");
  return page(
    ok
      ? "You've been unsubscribed and won't receive further emails from this campaign."
      : "This unsubscribe link is invalid or has expired."
  );
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const ok = await unsubscribe(url.searchParams.get("e") || "", url.searchParams.get("t") || "");
  return NextResponse.json({ ok });
}
