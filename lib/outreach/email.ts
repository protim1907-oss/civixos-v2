import crypto from "crypto";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { OutreachCampaign } from "./types";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const UNSUB_SECRET =
  process.env.OUTREACH_UNSUB_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "dev-secret";

export function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://civix250.ai"
  ).replace(/\/$/, "");
}

// Signed token so unsubscribe links can't be forged to suppress arbitrary
// addresses. The token is derived from the recipient's email.
export function unsubToken(email: string): string {
  return crypto
    .createHmac("sha256", UNSUB_SECRET)
    .update(email.trim().toLowerCase())
    .digest("hex")
    .slice(0, 32);
}

export function verifyUnsubToken(email: string, token: string): boolean {
  const expected = unsubToken(email);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    return false;
  }
}

export function unsubscribeUrl(email: string): string {
  const params = new URLSearchParams({ e: email, t: unsubToken(email) });
  return `${getBaseUrl()}/api/outreach/unsubscribe?${params.toString()}`;
}

// Global opt-out / bounce check. Runs before every send.
export async function isSuppressed(email: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("outreach_suppressions")
    .select("id")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  return Boolean(data);
}

export async function addSuppression(
  email: string,
  reason: "unsubscribed" | "bounced" | "complained" | "manual"
): Promise<void> {
  await supabaseAdmin
    .from("outreach_suppressions")
    .upsert(
      { email: email.trim().toLowerCase(), reason },
      { onConflict: "email" }
    );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildHtml(
  bodyText: string,
  campaign: OutreachCampaign,
  unsubUrl: string
): string {
  const paragraphs = bodyText
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;">${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");

  // CAN-SPAM: honest sender, physical postal address, working opt-out.
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:#1f2937;max-width:600px;">
  ${paragraphs}
  <p style="margin:18px 0 0;">— ${escapeHtml(campaign.from_name)}</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0 12px;"/>
  <p style="font-size:12px;color:#6b7280;margin:0;">
    ${escapeHtml(campaign.postal_address)}<br/>
    You received this because your office is a public government contact.
    <a href="${unsubUrl}" style="color:#6b7280;">Unsubscribe</a> to stop receiving these emails.
  </p>
</div>`;
}

export type SendResult =
  | { ok: true; providerId: string | null }
  | { ok: false; error: string; suppressed?: boolean };

export async function sendCampaignEmail(params: {
  campaign: OutreachCampaign;
  to: string;
  subject: string;
  bodyText: string;
}): Promise<SendResult> {
  const { campaign, to, subject, bodyText } = params;

  if (!resend) {
    return { ok: false, error: "RESEND_API_KEY is not configured." };
  }
  if (await isSuppressed(to)) {
    return { ok: false, error: "Recipient is on the suppression list.", suppressed: true };
  }

  const unsubUrl = unsubscribeUrl(to);

  try {
    const { data, error } = await resend.emails.send({
      from: `${campaign.from_name} <${campaign.from_email}>`,
      to,
      subject,
      html: buildHtml(bodyText, campaign, unsubUrl),
      replyTo: campaign.reply_to || campaign.from_email,
      headers: {
        "List-Unsubscribe": `<${unsubUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });

    if (error) {
      return { ok: false, error: error.message || "Resend send failed." };
    }
    return { ok: true, providerId: data?.id ?? null };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unexpected send error.",
    };
  }
}
