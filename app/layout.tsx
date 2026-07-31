import "./globals.css";
import { APP_NAME } from "@/lib/config";

const HOME_TITLE = `${APP_NAME} — Your Voice in Democracy`;
const HOME_DESCRIPTION = `${APP_NAME} — connect with your representatives, track local issues, and help shape policy in your district.`;

export const metadata = {
  metadataBase: new URL("https://www.civix250.ai"),
  title: APP_NAME,
  description: `${APP_NAME} — AI-powered civic engagement platform`,
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: "https://www.civix250.ai",
    siteName: APP_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">
        {/* Global Branding Header (optional but recommended) */}
        <div className="hidden">
          {APP_NAME}
        </div>

        {children}
      </body>
    </html>
  );
}
