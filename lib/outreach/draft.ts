import OpenAI from "openai";
import type { OutreachCampaign, OutreachLead } from "./types";

// Drafting model. gpt-4.1-mini is a strong, cost-appropriate choice for
// high-volume personalized copy — good instruction-following at low per-lead
// cost, which matters at campaign scale. Override with OUTREACH_DRAFT_MODEL.
const DRAFT_MODEL = process.env.OUTREACH_DRAFT_MODEL || "gpt-4.1-mini";

const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export type DraftResult = { subject: string; body: string };

function leadContext(lead: OutreachLead): string {
  return [
    lead.contact_name && `Contact: ${lead.contact_name}`,
    lead.title && `Title/Role: ${lead.title}`,
    lead.org_name && `Company: ${lead.org_name}`,
    lead.industry && `Industry: ${lead.industry}`,
    lead.country && `Country: ${lead.country}`,
    lead.region && `Region: ${lead.region}`,
    lead.website && `Website: ${lead.website}`,
    lead.notes && `Notes: ${lead.notes}`,
    // Legacy B2G fields — harmless if null.
    lead.office_type && `Office type: ${lead.office_type}`,
    lead.state && !lead.country && `State: ${lead.state}`,
  ]
    .filter(Boolean)
    .join("\n");
}

// Models often add a "Best,\nName\nOrg" sign-off despite instructions, and the
// send step appends its own signature — which would double it up. Strip a
// trailing sign-off block conservatively (only closing phrases + the sender's
// own name/org lines at the very end).
function stripSignoff(body: string, campaign: OutreachCampaign): string {
  const closing =
    /^(best|thanks|thank you|regards|kind regards|warm regards|best regards|cheers|sincerely|talk soon|looking forward|yours( truly| sincerely)?)\b[\s,.!—-]*$/i;
  // Full name, org, AND individual name tokens (e.g. a bare first name
  // "Protim") — a model sometimes signs off with just the first name, which
  // would otherwise survive and double up with the appended signature.
  const names = new Set<string>();
  for (const src of [campaign.from_name, campaign.sender_org]) {
    if (!src) continue;
    const v = src.trim().toLowerCase();
    names.add(v);
    for (const tok of v.split(/\s+/)) if (tok.length > 1) names.add(tok);
  }

  let lines = body.replace(/\r/g, "").split("\n");
  // Drop trailing blank lines.
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();

  // If a bare closing phrase ("Best,", "Regards," …) appears in the last few
  // lines, cut it and everything after it — this catches sign-offs that use
  // only a first name (e.g. "Best,\nProtim"), which the send step would
  // otherwise double up against the appended signature.
  const window = Math.min(5, lines.length);
  for (let k = lines.length - window; k < lines.length; k++) {
    if (k >= 0 && closing.test((lines[k] || "").trim())) {
      lines = lines.slice(0, k);
      break;
    }
  }

  // Also drop any remaining trailing lines that are exactly the sender's
  // name/org (a sign-off with no closing phrase).
  while (lines.length) {
    const last = (lines[lines.length - 1] || "").trim();
    if (!last) { lines.pop(); continue; }
    if (names.has(last.toLowerCase())) { lines.pop(); continue; }
    break;
  }
  return lines.join("\n").trim();
}

function stripToJson(text: string): string {
  // Models sometimes wrap JSON in ``` fences; strip them defensively.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const braces = text.match(/\{[\s\S]*\}/);
  return (braces?.[0] || text).trim();
}

// Draft a single personalized cold-outreach email for one lead. The persona is
// driven entirely by the campaign (sender_org / offering / goal / ai_prompt), so
// the same engine works for any product. The compliant footer (unsubscribe +
// postal address) is added at SEND time, not here.
export async function draftEmail(
  campaign: OutreachCampaign,
  lead: OutreachLead
): Promise<DraftResult> {
  if (!client) {
    throw new Error("OPENAI_API_KEY is not configured — cannot draft emails.");
  }

  const org = campaign.sender_org || campaign.from_name;
  const offering = campaign.offering || campaign.goal || "the sender's product/service";

  const system = [
    `You write concise, professional B2B cold-outreach emails on behalf of ${org}.`,
    `What ${org} offers: ${offering}.`,
    "Rules:",
    "- Be genuine and specific to the recipient and their company; never sound like mass spam.",
    "- 70-130 words. Plain, warm, direct. No hype, no emojis, no ALL-CAPS, no buzzword salad.",
    "- Honest subject line that reflects the body (CAN-SPAM). No clickbait, no fake 'RE:'/'FWD:'.",
    "- Lead with a relevant, specific hook, then one clear, low-friction call to action (a short reply or a quick call).",
    "- Do NOT fabricate facts, statistics, case studies, endorsements, or any prior contact.",
    "- Write for an international audience (US, Europe, UAE); keep it culturally neutral and jargon-light.",
    "- Do NOT include a signature block, unsubscribe line, or postal address — those are appended automatically.",
    'Return ONLY minified JSON: {"subject": "...", "body": "..."} with no markdown, no commentary.',
  ].join("\n");

  const userPrompt = [
    `Campaign goal: ${campaign.goal || campaign.name}`,
    campaign.ai_prompt ? `Additional guidance / talking points:\n${campaign.ai_prompt}` : "",
    `Sender name (signs the email): ${campaign.from_name}`,
    `Sender organization: ${org}`,
    "",
    "Recipient details:",
    leadContext(lead) ||
      "(minimal details available — keep it general but relevant to a founder/company evaluating building an MVP)",
    "",
    "Write the email now. Return only the JSON object.",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await client.chat.completions.create({
    model: DRAFT_MODEL,
    temperature: 0.7,
    max_tokens: 700,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: userPrompt },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "";

  let parsed: DraftResult;
  try {
    parsed = JSON.parse(stripToJson(raw));
  } catch {
    throw new Error("Draft model did not return valid JSON.");
  }

  if (!parsed.subject?.trim() || !parsed.body?.trim()) {
    throw new Error("Draft model returned an empty subject or body.");
  }

  const body = stripSignoff(parsed.body.trim(), campaign);
  if (!body) {
    // The whole body looked like a sign-off — fall back to the raw draft.
    return { subject: parsed.subject.trim(), body: parsed.body.trim() };
  }
  return { subject: parsed.subject.trim(), body };
}
