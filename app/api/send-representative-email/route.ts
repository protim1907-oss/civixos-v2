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
      { error: "Email service is not configured. Please contact support." },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();

    const {
      citizenName,
      citizenEmail,
      representativeName,
      representativeTitle,
      representativeEmail,
      subject,
      message,
      district,
    } = body;

    if (!citizenName || !message || !representativeName) {
      return NextResponse.json(
        { error: "Missing required fields: citizenName, message, representativeName" },
        { status: 400 }
      );
    }

    if (!subject?.trim()) {
      return NextResponse.json(
        { error: "Subject is required." },
        { status: 400 }
      );
    }

    if (!message?.trim()) {
      return NextResponse.json(
        { error: "Message body is required." },
        { status: 400 }
      );
    }

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 640px; margin: 0 auto; background: #ffffff;">

        <!-- Header -->
        <div style="background: #0f172a; padding: 24px 32px; border-radius: 12px 12px 0 0;">
          <p style="color: #94a3b8; font-size: 12px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; margin: 0 0 4px;">Civix250 · Constituent Message</p>
          <p style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 0;">civix250.ai</p>
        </div>

        <!-- Body -->
        <div style="padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">

          <p style="color: #475569; font-size: 14px; margin: 0 0 24px;">
            The following constituent message was submitted via <strong>Civix250</strong> — an AI-powered civic engagement platform connecting citizens with their elected representatives.
          </p>

          <!-- From / To -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #94a3b8; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; width: 80px;">From</td>
                <td style="padding: 6px 0; color: #0f172a; font-size: 14px; font-weight: 600;">${citizenName}${citizenEmail ? ` &lt;${citizenEmail}&gt;` : ""}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #94a3b8; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em;">To</td>
                <td style="padding: 6px 0; color: #0f172a; font-size: 14px; font-weight: 600;">${representativeName}${representativeTitle ? `, ${representativeTitle}` : ""}</td>
              </tr>
              ${district ? `
              <tr>
                <td style="padding: 6px 0; color: #94a3b8; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em;">District</td>
                <td style="padding: 6px 0; color: #0f172a; font-size: 14px;">${district}</td>
              </tr>` : ""}
            </table>
          </div>

          <!-- Message -->
          <div style="margin-bottom: 24px;">
            <p style="color: #475569; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 12px;">Message</p>
            <div style="background: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 0 8px 8px 0; padding: 20px 24px;">
              <p style="color: #1e293b; font-size: 15px; line-height: 1.8; margin: 0; white-space: pre-wrap;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
            </div>
          </div>

          <!-- Footer note -->
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
            <p style="color: #1d4ed8; font-size: 13px; line-height: 1.6; margin: 0;">
              💡 <strong>Note:</strong> This message was drafted by a constituent using Civix250's AI-assisted messaging tool. Reply directly to this email to respond to the constituent${citizenEmail ? ` at ${citizenEmail}` : ""}.
            </p>
          </div>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />

          <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
            Sent via <a href="https://civix250.ai" style="color: #3b82f6; text-decoration: none;">civix250.ai</a> · America's Civic Engagement Platform<br />
            This platform is nonpartisan and does not represent any political party, candidate, or campaign.
          </p>
        </div>
      </div>
    `;

    const toAddresses: string[] = [];
    if (representativeEmail && representativeEmail.includes("@")) {
      toAddresses.push(representativeEmail);
    }
    toAddresses.push("messages@civix250.ai");

    await transporter.sendMail({
      from: `"Civix250 Messages" <messages@civix250.ai>`,
      to: toAddresses.join(", "),
      ...(citizenEmail && { replyTo: citizenEmail, cc: citizenEmail }),
      subject: `[Civix250] ${subject}`,
      html: htmlBody,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Send representative email error:", err);
    return NextResponse.json(
      { error: "Failed to send email. Please try again." },
      { status: 500 }
    );
  }
}
