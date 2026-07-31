import type { Metadata } from "next";

// The login page itself is a client component, so its metadata lives here.
// The opengraph-image.tsx / twitter-image.tsx files in this folder supply the
// card image automatically — this just adds the titles, description, URL, and
// the summary_large_image card type so X renders a big, clickable preview.

const title = "Log in to Civix250";
const description =
  "Power the future of civic engagement — view local issues, message your representatives, and help shape policy in your district.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    url: "https://www.civix250.ai/login",
    siteName: "Civix250",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
