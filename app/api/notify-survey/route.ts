import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export const runtime = "nodejs";

// Sender identity. The domain in RESEND_FROM must be a VERIFIED domain in your
// Resend account (verify it in the Resend dashboard — that's an account action
// you do yourself). Overridable via env without a code change.
const FROM = process.env.RESEND_FROM || "Civix250 <surveys@civix250.ai>";
const REPLY_TO = process.env.RESEND_REPLY_TO || "messages@civix250.ai";
const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://www.civix250.ai"
).replace(/\/$/, "");

// Only these roles may trigger a district-wide email blast.
const ALLOWED_PUBLISHER_ROLES = new Set(["moderator", "official", "admin"]);
const BATCH_SIZE = 100; // Resend batch.send accepts up to 100 messages per call.

// Districts are sometimes stored padded (MD-01) and sometimes not (MD-1), and
// survey creation only upper-cases the value. Match residents on every variant.
function districtVariants(raw: string): string[] {
  const d = String(raw || "").trim().toUpperCase();
  const m = d.match(/^([A-Z]{2})-(\d{1,3})$/);
  if (!m) return [d];
  const prefix = m[1];
  const n = Number(m[2]);
  return Array.from(
    new Set([d, `${prefix}-${n}`, `${prefix}-${String(n).padStart(2, "0")}`])
  );
}

function esc(s: string) {
  return String(s || "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string)
  );
}

function surveyEmailHtml(opts: {
  name: string;
  title: string;
  district: string;
  question: string;
  deadline: string;
  link: string;
}) {
  const first = (opts.name || "").trim().split(" ")[0] || "there";
  const deadlineLine = opts.deadline
    ? `<p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 16px">Responses close: <strong>${esc(
        opts.deadline
      )}</strong></p>`
    : "";
  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:32px">
    <p style="font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#3b82f6;margin:0 0 8px">Policy Pulse · ${esc(
      opts.district
    )}</p>
    <h2 style="color:#0f172a;margin:0 0 12px;font-size:20px">A new survey for your district, ${esc(
      first
    )}</h2>
    <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 8px">
      <strong>${esc(opts.title)}</strong>
    </p>
    <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 16px">${esc(
      opts.question
    )}</p>
    ${deadlineLine}
    <a href="${opts.link}"
       style="display:inline-block;margin-top:4px;background:#0f172a;color:#fff;padding:12px 28px;border-radius:12px;text-decoration:none;font-weight:600">
      Respond to the survey
    </a>
    <p style="color:#94a3b8;font-size:12px;margin-top:32px;line-height:1.6">
      You're receiving this because you're registered in ${esc(
        opts.district
      )} on Civix250.
      Sent via <a href="${SITE_URL}" style="color:#3b82f6;text-decoration:none">civix250.ai</a>.
    </p>
  </div>`;
}

export async function POST(req: NextRequest) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "Email service not configured (RESEND_API_KEY missing)." },
      { status: 503 }
    );
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // --- Authenticate the caller (must be a publisher role) --------------------
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { data: callerProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();
  if (!callerProfile || !ALLOWED_PUBLISHER_ROLES.has(String(callerProfile.role))) {
    return NextResponse.json(
      { error: "Forbidden — only moderators, officials, or admins can notify." },
      { status: 403 }
    );
  }

  // --- Input ----------------------------------------------------------------
  let surveyId = "";
  try {
    const body = await req.json();
    surveyId = String(body?.surveyId || "");
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!surveyId) {
    return NextResponse.json({ error: "surveyId is required." }, { status: 400 });
  }

  // --- Load survey ----------------------------------------------------------
  const { data: survey, error: sErr } = await admin
    .from("policy_pulse_surveys")
    .select("id, title, district, summary, primary_question, deadline, is_published, notified_at")
    .eq("id", surveyId)
    .single();
  if (sErr || !survey) {
    return NextResponse.json(
      {
        error: `Survey lookup failed: ${sErr?.message || "not found"}`,
        hint: sErr?.message?.includes("notified_at")
          ? "Run sql/add-survey-notified-at.sql in the Supabase SQL editor first."
          : undefined,
      },
      { status: 404 }
    );
  }
  if (!survey.is_published) {
    return NextResponse.json({ error: "Survey is not published." }, { status: 400 });
  }
  // Idempotency guard: never email the same survey twice (republish/edit safe).
  if (survey.notified_at) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "already notified",
      notified_at: survey.notified_at,
    });
  }

  // --- Recipients: citizens in the district, real deliverable emails --------
  const { data: recipients, error: rErr } = await admin
    .from("profiles")
    .select("email, full_name")
    .in("district", districtVariants(survey.district))
    .eq("role", "citizen")
    .not("email", "is", null);
  if (rErr) {
    return NextResponse.json(
      { error: `Recipient lookup failed: ${rErr.message}` },
      { status: 500 }
    );
  }

  const seen = new Set<string>();
  const list = (recipients || [])
    .map((r) => ({
      email: String(r.email || "").trim().toLowerCase(),
      name: r.full_name || "",
    }))
    .filter((r) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email))
    .filter((r) => !/\.demo@civix250\.com$/i.test(r.email)) // skip demo mailboxes
    .filter((r) => (seen.has(r.email) ? false : (seen.add(r.email), true)));

  const stampNotified = () =>
    admin
      .from("policy_pulse_surveys")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", survey.id);

  if (list.length === 0) {
    await stampNotified(); // don't keep retrying an empty district
    return NextResponse.json({
      ok: true,
      sent: 0,
      reason: "no eligible recipients in district",
      district: survey.district,
    });
  }

  // --- Send via Resend, batched --------------------------------------------
  const resend = new Resend(process.env.RESEND_API_KEY);
  const subject = `New Policy Pulse survey for ${survey.district}: ${survey.title}`;
  const link = `${SITE_URL}/policy-pulse?survey=${encodeURIComponent(survey.id)}`;

  let sent = 0;
  const errors: string[] = [];
  for (let i = 0; i < list.length; i += BATCH_SIZE) {
    const chunk = list.slice(i, i + BATCH_SIZE);
    const payload = chunk.map((r) => ({
      from: FROM,
      to: [r.email],
      replyTo: REPLY_TO,
      subject,
      html: surveyEmailHtml({
        name: r.name,
        title: survey.title,
        district: survey.district,
        question: survey.primary_question || survey.summary || "",
        deadline: survey.deadline || "",
        link,
      }),
    }));
    const { error } = await resend.batch.send(payload);
    if (error) errors.push(error.message || "batch send failed");
    else sent += chunk.length;
  }

  // Stamp only if at least one batch went out, so a total failure can be retried.
  if (sent > 0) await stampNotified();

  return NextResponse.json({
    ok: errors.length === 0,
    sent,
    total: list.length,
    district: survey.district,
    errors: errors.length ? errors : undefined,
  });
}
