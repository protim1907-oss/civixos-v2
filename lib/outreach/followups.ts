import type { OutreachCampaign, OutreachLead } from "./types";

// Follow-up sequence for non-responders. The initial email already went out;
// these are the threaded replies that follow. Signature + CAN-SPAM footer are
// appended at send time by buildHtml (email.ts), so bodies here omit them.
//
// Timing: days to wait before each step, measured from the PREVIOUS send.
//   index 0 -> wait before follow-up #1 (from the initial send)
//   index 1 -> wait before follow-up #2 (from follow-up #1)
//   index 2 -> wait before follow-up #3 (from follow-up #2)
export const FOLLOWUP_INTERVAL_DAYS = [3, 4, 6];
export const MAX_FOLLOWUPS = 3;

function firstName(lead: OutreachLead): string {
  return (lead.contact_name || "").trim().split(/\s+/)[0] || "there";
}
function company(lead: OutreachLead): string {
  return (lead.org_name || "your company").trim();
}

type Template = (lead: OutreachLead) => string;

// Follow-up #1..#3 for the Bump (invoice-chasing) campaign.
const BUMP: Template[] = [
  (l) =>
    `Hi ${firstName(l)}, bumping this once in case it slipped by. Quick one — how are you currently chasing overdue invoices, manually or is it handled? If it's still manual, Bump can take it off your plate.`,
  (l) =>
    `Hi ${firstName(l)}, the reason I think Bump's worth 2 minutes: it auto-sends well-timed, polite payment reminders so you get paid faster without the awkward "just following up" emails — and you keep full control (approve messages, set quiet hours). Free to try, no card: https://bumppaid.com. Want me to send a 30-second overview?`,
  (l) =>
    `Hi ${firstName(l)}, I'll stop here so I'm not adding to the inbox you're already managing. If chasing late payments ever gets old, Bump's a click away at https://bumppaid.com — otherwise, all the best with ${company(l)}.`,
];

// Follow-up #1..#3 for the MVP / product-build campaign.
const MVP: Template[] = [
  (l) =>
    `Hi ${firstName(l)}, floating this back to the top of your inbox in case it got buried. Quick question — is getting ${company(l)}'s next build launched faster something on your radar this quarter, or not a priority right now? Either answer helps me know whether to follow up.`,
  (l) =>
    `Hi ${firstName(l)}, one concrete reason I reached out: we took a fintech from a stalled single-market setup to scaling past 1M users, and a Romanian marketplace from zero to a live 3-sided MVP in months. If a faster, senior-led path to launch would help ${company(l)}, I'm happy to share a rough 2-week plan on a 15-min call. Worth a look? → https://www.bidsprointernational.com/#case-studies`,
  (l) =>
    `Hi ${firstName(l)}, I don't want to keep cluttering your inbox — I'll assume the timing isn't right and close the loop here. If building or accelerating an MVP becomes a priority down the line, just reply and I'll pick it back up. Wishing ${company(l)} the best either way.`,
];

// Which template set applies to a campaign. Returns null for campaigns we don't
// have a sequence for (e.g. the Civix250 B2G campaigns) — those get no
// follow-ups rather than the wrong copy.
export function followupKey(campaign: OutreachCampaign): "bump" | "mvp" | null {
  const n = (campaign.name || "").toLowerCase();
  if (n.includes("bump")) return "bump";
  if (n.includes("mvp")) return "mvp";
  return null;
}

// Body for a given 1-based follow-up step, or null if out of range / no sequence.
export function followupBody(
  campaign: OutreachCampaign,
  lead: OutreachLead,
  step: number
): string | null {
  const key = followupKey(campaign);
  if (!key) return null;
  const set = key === "bump" ? BUMP : MVP;
  const t = set[step - 1];
  return t ? t(lead) : null;
}

// "Re: <original subject>" for threading, avoiding a doubled "Re:".
export function followupSubject(originalSubject: string | null): string {
  const base = (originalSubject || "Following up").replace(/^\s*re:\s*/i, "").trim();
  return `Re: ${base}`;
}
