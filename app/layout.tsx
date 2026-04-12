import "./globals.css";
import { APP_NAME } from "@/lib/config";

export const metadata = {
  title: APP_NAME,
  description: `${APP_NAME} — AI-powered civic engagement platform`,
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
