import "./globals.css";
import Script from "next/script";
import { APP_NAME } from "@/lib/config";
import AskCivixWidget from "@/components/AskCivixWidget";
import XSignupTracker from "@/components/XSignupTracker";

const FB_PIXEL_ID = "1494627242694614";
// X (Twitter) Ads pixel id — set NEXT_PUBLIC_X_PIXEL_ID to enable. Until then
// the pixel does not load. See lib/x-pixel.ts for the conversion event.
const X_PIXEL_ID = process.env.NEXT_PUBLIC_X_PIXEL_ID;

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

        {/* X (Twitter) Pixel — only loads when NEXT_PUBLIC_X_PIXEL_ID is set */}
        {X_PIXEL_ID ? (
          <Script id="x-pixel" strategy="afterInteractive">
            {`!function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);},s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
twq('config','${X_PIXEL_ID}');`}
          </Script>
        ) : null}
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
        <XSignupTracker />
      </body>
    </html>
  );
}
