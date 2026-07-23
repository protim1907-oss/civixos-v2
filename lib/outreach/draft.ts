import Anthropic from "@anthropic-ai/sdk";
import type { OutreachCampaign, OutreachLead } from "./types";

// Drafting model. Sonnet 5 is a strong, cost-appropriate choice for high-volume
// personalized copy. Thinking is disabled — email drafting is not a reasoning
// task and per-lead latency/cost matters at campaign scale.
const DRAFT_MODEL = "claude-sonnet-5";

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export type DraftResult = { subject: string; body: string };

function leadContext(lead: OutreachLead): string {
  return [
    lead.contact_name && `Contact: ${lead.contact_name}`,
    lead.title && `Title: ${lead.title}`,
    lead.org_name && `Organization/Office: ${lead.org_name}`,
    lead.office_type && `Office type: ${lead.office_type}`,
    lead.state && `State: ${lead.state}`,
    lead.district && `District: ${lead.district}`,
    lead.website && `Website: ${lead.website}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function stripToJson(text: string): string {
  // Models sometimes wrap JSON in ``` fences; strip them defensively.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const braces = text.match(/\{[\s\S]*\}/);
  return (braces?.[0] || text).trim();
}

// Draft a single personalized outreach email for one lead. The compliant
// footer (unsubscribe + postal address) is added at send time, not here.
export async function draftEmail(
  campaign: OutreachCampaign,
  lead: OutreachLead
): Promise<DraftResult> {
  if (!client) {
    throw new Error(
      "ANTHROPIC_API_KEY is not configured — cannot draft emails."
    );
  }

  const system = [
    "You write concise, professional B2G (business-to-government) outreach emails on behalf of Civix250, a civic-engagement platform that connects citizens with their representatives.",
    "Rules:",
    "- Be genuine and specific to the recipient's office; never sound like mass spam.",
    "- 90-150 words. Plain, warm, direct. No hype, no emojis, no ALL-CAPS.",
    "- Honest subject line that reflects the body (CAN-SPAM). No clickbait, no 'RE:' fakery.",
    "- One clear call to action. Do not fabricate facts, statistics, endorsements, or prior contact.",
    "- Do NOT include a signature block, unsubscribe line, or postal address — those are appended automatically.",
    'Return ONLY minified JSON: {"subject": "...", "body": "..."} with no markdown, no commentary.',
  ].join("\n");

  const userPrompt = [
    `Campaign goal: ${campaign.goal || campaign.name}`,
    campaign.ai_prompt ? `Additional guidance / talking points:\n${campaign.ai_prompt}` : "",
    `Sender: ${campaign.from_name}`,
    "",
    "Recipient details:",
    leadContext(lead) || "(minimal details available — keep it general but relevant to a government office)",
    "",
    'Write the email now. Return only the JSON object.',
  ]
    .filter(Boolean)
    .join("\n");

  const response = await client.messages.create({
    model: DRAFT_MODEL,
    max_tokens: 2000,
    thinking: { type: "disabled" },
    system,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const raw = textBlock && "text" in textBlock ? textBlock.text : "";

  let parsed: DraftResult;
  try {
    parsed = JSON.parse(stripToJson(raw));
  } catch {
    throw new Error("Draft model did not return valid JSON.");
  }

  if (!parsed.subject?.trim() || !parsed.body?.trim()) {
    throw new Error("Draft model returned an empty subject or body.");
  }

  return { subject: parsed.subject.trim(), body: parsed.body.trim() };
}
