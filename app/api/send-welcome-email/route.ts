import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

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
    return NextResponse.json(
      { error: "Email service is not configured." },
      { status: 503 }
    );
  }

  try {
    const { email, fullName } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const firstName = (fullName || "").trim().split(" ")[0] || "there";

    await transporter.sendMail({
      from: `"Civix250" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Welcome to Civix250 — thanks for joining!",
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <h2 style="color:#0f172a;margin:0 0 12px">Welcome to Civix250, ${firstName}!</h2>
          <p style="color:#475569;font-size:15px;line-height:1.6">
            Thank you for registering. Your voice now has a direct line to your representatives,
            local issues, and the policy decisions shaping your community.
          </p>
          <p style="color:#475569;font-size:15px;line-height:1.6">
            Here's what you can do right away:
          </p>
          <ul style="color:#475569;font-size:15px;line-height:1.8;padding-left:20px">
            <li>Find and message your representatives</li>
            <li>Vote on Policy Pulse surveys for your district</li>
            <li>Post and discuss local issues in your district feed</li>
          </ul>
          <a href="https://civix250.ai/dashboard"
             style="display:inline-block;margin-top:16px;background:#0f172a;color:#fff;padding:12px 28px;border-radius:12px;text-decoration:none;font-weight:600">
            Go to your dashboard
          </a>
          <p style="color:#94a3b8;font-size:12px;margin-top:32px;text-align:center">
            Sent via <a href="https://civix250.ai" style="color:#3b82f6;text-decoration:none">civix250.ai</a> · America's Civic Engagement Platform
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("send-welcome-email error:", err);
    return NextResponse.json(
      { error: "Failed to send welcome email." },
      { status: 500 }
    );
  }
}
