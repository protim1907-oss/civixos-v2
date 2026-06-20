import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();
    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required." }, { status: 400 });
    }

    // Verify HMAC signature
    const [payload, sig] = token.split(".");
    if (!payload || !sig) {
      return NextResponse.json({ error: "Invalid reset token." }, { status: 400 });
    }

    const expectedSig = crypto
      .createHmac("sha256", SECRET)
      .update(payload)
      .digest("base64url");

    if (sig !== expectedSig) {
      return NextResponse.json({ error: "Invalid reset token." }, { status: 400 });
    }

    // Decode payload and check expiry
    const decoded = Buffer.from(payload, "base64url").toString("utf8");
    const [userId, expiryStr] = decoded.split("|");
    const expiry = parseInt(expiryStr, 10);

    if (!userId || isNaN(expiry) || Date.now() > expiry) {
      return NextResponse.json({ error: "Reset link has expired. Please request a new one." }, { status: 400 });
    }

    // Update the user's password via admin API
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("reset-password error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
