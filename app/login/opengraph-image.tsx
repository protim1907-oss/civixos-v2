import { ImageResponse } from "next/og";

// Social link-preview card for /login. Next.js auto-wires this into
// <meta property="og:image"> (and, via twitter-image.tsx, twitter:image) so
// that pasting https://www.civix250.ai/login into X/LinkedIn/etc. renders a
// large, clickable card that opens the login page. Mirrors the real two-panel
// login layout so it reads like a screenshot of the page.

export const alt =
  "Log in to Civix250 — Power the future of civic engagement";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  const inputBar = {
    display: "flex",
    height: 44,
    borderRadius: 10,
    background: "#eef2f7",
    border: "1px solid #e2e8f0",
    marginTop: 8,
  } as const;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "linear-gradient(135deg, #eef2f7 0%, #e6edf6 100%)",
          padding: 56,
          fontFamily: "sans-serif",
        }}
      >
        {/* Left — headline / value prop */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            paddingRight: 44,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 20,
              letterSpacing: 3,
              color: "#64748b",
              fontWeight: 700,
            }}
          >
            CIVIX250 · CITIZEN LOGIN
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 60,
              fontWeight: 800,
              color: "#0f172a",
              lineHeight: 1.05,
              marginTop: 22,
            }}
          >
            Power the Future of Civic Engagement
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 25,
              color: "#475569",
              marginTop: 24,
              lineHeight: 1.4,
            }}
          >
            View local issues, message your representatives, and help shape
            policy in your district.
          </div>

          {/* spacer */}
          <div style={{ display: "flex", flexGrow: 1 }} />

          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                display: "flex",
                background: "#16a34a",
                color: "white",
                fontSize: 24,
                fontWeight: 700,
                padding: "14px 28px",
                borderRadius: 14,
              }}
            >
              Log in →
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 22,
                color: "#334155",
                fontWeight: 600,
                marginLeft: 18,
              }}
            >
              civix250.ai/login
            </div>
          </div>
        </div>

        {/* Right — login form mock */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 430,
            background: "white",
            borderRadius: 24,
            boxShadow: "0 20px 50px rgba(15,23,42,0.12)",
            padding: 34,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 16,
              letterSpacing: 2,
              color: "#16a34a",
              fontWeight: 700,
            }}
          >
            WELCOME BACK
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 34,
              fontWeight: 800,
              color: "#0f172a",
              marginTop: 8,
            }}
          >
            Log in to Civix250
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 15,
              color: "#64748b",
              marginTop: 22,
            }}
          >
            Email
          </div>
          <div style={inputBar} />

          <div
            style={{
              display: "flex",
              fontSize: 15,
              color: "#64748b",
              marginTop: 16,
            }}
          >
            Password
          </div>
          <div style={inputBar} />

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: 50,
              borderRadius: 12,
              background: "#2563eb",
              color: "white",
              fontSize: 20,
              fontWeight: 700,
              marginTop: 24,
            }}
          >
            Login with Email
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: 50,
              borderRadius: 12,
              background: "#16a34a",
              color: "white",
              fontSize: 19,
              fontWeight: 700,
              marginTop: 14,
            }}
          >
            Continue with Google
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
