import type { Metadata } from "next";

// The signup page is a client component, so its metadata lives here. The
// opengraph-image.tsx / twitter-image.tsx files in this folder supply the card
// image automatically.

const title = "Join Civix250";
const description =
  "Create your free citizen account to connect with your representatives, track local issues, and help shape policy in your district.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    url: "https://www.civix250.ai/signup",
    siteName: "Civix250",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
