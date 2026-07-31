import {
  renderCivixCard,
  OG_SIZE,
  OG_CONTENT_TYPE,
} from "@/lib/og/civix-card";

export const alt = "Log in to Civix250 — Power the future of civic engagement";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderCivixCard({
    eyebrow: "CIVIX250 · CITIZEN LOGIN",
    headline: "Power the Future of Civic Engagement",
    subtext:
      "View local issues, message your representatives, and help shape policy in your district.",
    ctaLabel: "Log in →",
    urlLabel: "civix250.ai/login",
    panelKicker: "WELCOME BACK",
    panelTitle: "Log in to Civix250",
    fields: ["Email", "Password"],
    primaryLabel: "Login with Email",
    secondaryLabel: "Continue with Google",
  });
}
