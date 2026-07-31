import {
  renderCivixCard,
  OG_SIZE,
  OG_CONTENT_TYPE,
} from "@/lib/og/civix-card";

export const alt = "Join Civix250 — Create your citizen account";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderCivixCard({
    eyebrow: "CIVIX250 · CREATE YOUR ACCOUNT",
    headline: "Join Civix250 in Minutes",
    subtext:
      "Create your free citizen account to connect with your representatives and shape local policy.",
    ctaLabel: "Sign up →",
    urlLabel: "civix250.ai/signup",
    panelKicker: "GET STARTED",
    panelTitle: "Create your account",
    fields: ["Full name", "Email", "Password"],
    primaryLabel: "Create account",
    secondaryLabel: "Continue with Google",
  });
}
