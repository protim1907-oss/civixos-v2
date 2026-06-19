import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

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
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return NextResponse.json({ error: "Email service not configured." }, { status: 503 });
  }

  try {
    const { senderName, recipientName, messagePreview } = await req.json();

    if (!senderName || !recipientName || !messagePreview) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // Look up recipient's email from their profile
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .ilike("full_name", recipientName)
      .single();

    if (!profile?.email) {
      // No email found — silently skip, don't fail the message send
      return NextResponse.json({ skipped: true });
    }

    const preview =
      messagePreview.length > 120
        ? messagePreview.slice(0, 120) + "..."
        : messagePreview;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 580px; margin: 0 auto;">
        <div style="background: #0f172a; padding: 24px 32px; border-radius: 12px 12px 0 0;">
          <p style="color: #94a3b8; font-size: 12px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; margin: 0 0 4px;">Civix250 · New Message</p>
          <p style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 0;">civix250.ai</p>
        </div>
        <div style="padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #0f172a; font-size: 16px; font-weight: 600; margin: 0 0 8px;">
            You have a new message from ${senderName}
          </p>
          <p style="color: #475569; font-size: 14px; margin: 0 0 24px;">
            ${profile.full_name || recipientName}, someone sent you a message on Civix250 while you were away.
          </p>
          <div style="background: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 0 8px 8px 0; padding: 16px 20px; margin-bottom: 24px;">
            <p style="color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 6px;">Message preview</p>
            <p style="color: #1e293b; font-size: 15px; line-height: 1.7; margin: 0;">${preview.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
          </div>
          <a href="https://civix250.ai/chat/${encodeURIComponent(senderName)}"
             style="display: inline-block; background: #2563eb; color: #ffffff; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 10px; text-decoration: none;">
            Reply on Civix250
          </a>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0 20px;" />
          <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
            Sent via <a href="https://civix250.ai" style="color: #3b82f6; text-decoration: none;">civix250.ai</a> · Civic Engagement Platform<br />
            You received this because someone sent you a message on Civix250.
          </p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"Civix250 Messages" <messages@civix250.ai>`,
      to: profile.email,
      subject: `New message from ${senderName} on Civix250`,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Chat notification error:", err);
    // Don't surface this error to the client — the message already saved
    return NextResponse.json({ error: "Notification failed." }, { status: 500 });
  }
}
