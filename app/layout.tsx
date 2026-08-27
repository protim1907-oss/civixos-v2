import "./globals.css";
import Script from "next/script";
import { APP_NAME } from "@/lib/config";
import AskCivixWidget from "@/components/AskCivixWidget";

const FB_PIXEL_ID = "1494627242694614";

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
      <head>
        {/* Meta (Facebook) Pixel */}
        <Script id="fb-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${FB_PIXEL_ID}');
fbq('track', 'PageView');`}
        </Script>
      </head>
      <body className="bg-slate-50 text-slate-900 antialiased">
        {/* Meta (Facebook) Pixel — noscript fallback */}
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src={`https://www.facebook.com/tr?id=${FB_PIXEL_ID}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>

        {/* Global Branding Header (optional but recommended) */}
        <div className="hidden">
          {APP_NAME}
        </div>

        {children}
        <AskCivixWidget />
      </body>
    </html>
  );
}
