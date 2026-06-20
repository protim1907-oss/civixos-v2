import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SITE_URL = "https://civix250.ai";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    // Verify the user exists
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data } = await supabaseAdmin.auth.admin.listUsers();
    const user = data?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

    // Always return success to avoid user enumeration
    if (!user) return NextResponse.json({ success: true });

    // Build a signed token: base64url(userId|expiry).hmac
    const expiry = Date.now() + 15 * 60 * 1000; // 15 minutes
    const payload = Buffer.from(`${user.id}|${expiry}`).toString("base64url");
    const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
    const token = `${payload}.${sig}`;

    const resetLink = `${SITE_URL}/reset-password?token=${token}`;

    await transporter.sendMail({
      from: `"Civix250" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Reset your Civix250 password",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <h2 style="color:#0f172a">Password Reset Request</h2>
          <p style="color:#475569">Click the button below to reset your Civix250 password. This link expires in 15 minutes.</p>
          <a href="${resetLink}"
             style="display:inline-block;margin-top:16px;background:#0f172a;color:#fff;padding:12px 28px;border-radius:12px;text-decoration:none;font-weight:600">
            Reset Password
          </a>
          <p style="color:#94a3b8;font-size:13px;margin-top:24px">
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("forgot-password error:", err);
    return NextResponse.json({ error: "Failed to send reset email." }, { status: 500 });
  }
}
