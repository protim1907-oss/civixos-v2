import type { MetadataRoute } from "next";

const SITE_URL = "https://civix250.ai";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin",
        "/moderator",
        "/dashboard",
        "/create-post",
        "/donation-tracker",
        "/my-representatives",
        "/official-dashboard",
        "/official-meetings",
        "/official-response-center",
        "/official-updates",
        "/chat/",
        "/reset-password",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
