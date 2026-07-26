import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

// JaaS (8x8.vc) requires an RS256 JWT signed with the app's private key to join
// a room. Signed here server-side — the private key never reaches the browser.
export const runtime = "nodejs";

const APP_ID = process.env.NEXT_PUBLIC_JAAS_APP_ID || "";
const KID = process.env.JAAS_KID || process.env.JAAS_API_KEY_ID || "";
// Env stores the PEM with literal "\n" — restore real newlines.
const PRIVATE_KEY = (process.env.JAAS_PRIVATE_KEY || "").replace(/\\n/g, "\n");

function base64url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

// Parse the private key once so a malformed key produces a clear, specific
// error instead of a cryptic signing failure on every call.
let privateKeyObj: crypto.KeyObject | null = null;
let privateKeyError = "";
if (PRIVATE_KEY) {
  try {
    privateKeyObj = crypto.createPrivateKey(PRIVATE_KEY);
  } catch (err) {
    privateKeyError = err instanceof Error ? err.message : String(err);
  }
}

export async function POST(req: NextRequest) {
  if (!APP_ID || !KID || !PRIVATE_KEY) {
    return NextResponse.json(
      {
        error:
          "Video service not configured. Set JAAS_KID and JAAS_PRIVATE_KEY (and NEXT_PUBLIC_JAAS_APP_ID) from the JaaS console.",
      },
      { status: 503 }
    );
  }

  if (!privateKeyObj) {
    return NextResponse.json(
      {
        error:
          "Video service misconfigured: JAAS_PRIVATE_KEY is not a valid PEM key" +
          (privateKeyError ? ` (${privateKeyError})` : "") +
          ". Ensure it starts with -----BEGIN PRIVATE KEY----- and newlines are written as \\n.",
      },
      { status: 503 }
    );
  }

  // Only authenticated users can mint a token. Identity is taken from the
  // verified session, never from client-supplied values.
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 });
  }
  const user = userData.user;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const displayName =
    profile?.full_name || profile?.email || user.email || "Civix250 User";
  const email = profile?.email || user.email || "";

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT", kid: KID };
  const payload = {
    aud: "jitsi",
    iss: "chat",
    sub: APP_ID,
    // "*" authorizes any room in this app; the token is per-user and short-lived.
    room: "*",
    iat: now,
    nbf: now - 10,
    exp: now + 2 * 60 * 60, // 2 hours
    context: {
      user: {
        id: user.id,
        name: displayName,
        email,
        avatar: "",
        // Both participants are moderators so a 2-person call isn't stuck
        // "waiting for a moderator".
        moderator: "true",
      },
      features: {
        livestreaming: "false",
        recording: "false",
        transcription: "false",
        "outbound-call": "false",
      },
    },
  };

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(
    JSON.stringify(payload)
  )}`;

  let signature: string;
  try {
    signature = crypto
      .createSign("RSA-SHA256")
      .update(signingInput)
      .sign(privateKeyObj, "base64url");
  } catch (err) {
    console.error("JaaS JWT signing failed:", err);
    return NextResponse.json(
      { error: "Could not sign the video token. Check JAAS_PRIVATE_KEY formatting." },
      { status: 500 }
    );
  }

  return NextResponse.json({ jwt: `${signingInput}.${signature}` });
}
