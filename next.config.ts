import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  distDir: ".next",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
  async redirects() {
    return [
      // Add an entry here whenever a route is renamed or removed, so old
      // bookmarks/emails/links keep working instead of 404ing. Example:
      // { source: "/donation-tracker", destination: "/donations", permanent: true },
    ]
  },
}

export default nextConfig
