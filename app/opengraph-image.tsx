import {
  renderCivixCard,
  OG_SIZE,
  OG_CONTENT_TYPE,
} from "@/lib/og/civix-card";

// Site-wide default card (used for "/" and inherited by any route that doesn't
// define its own opengraph-image).

export const alt = "Civix250 — Your voice in democracy";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderCivixCard({
    eyebrow: "CIVIX250 · YOUR VOICE IN DEMOCRACY",
    headline: "Your Voice. Your District. Your Democracy.",
    subtext:
      "Connect with your representatives, weigh in on local issues, and help shape policy — all on Civix250.",
    ctaLabel: "Get started →",
    urlLabel: "civix250.ai",
    panelKicker: "WELCOME",
    panelTitle: "Log in to Civix250",
    fields: ["Email", "Password"],
    primaryLabel: "Login with Email",
    secondaryLabel: "Continue with Google",
  });
}
