import { ImageResponse } from "next/og";

// Shared social link-preview card for Civix250 pages (home, login, signup).
// Rendered by each route's opengraph-image.tsx / twitter-image.tsx so that
// pasting a Civix250 link into X/LinkedIn/etc. shows a large, clickable card
// that mirrors the page it points to.

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

export type CivixCardProps = {
  eyebrow: string;
  headline: string;
  subtext: string;
  ctaLabel: string;
  urlLabel: string;
  panelKicker: string;
  panelTitle: string;
  fields: string[];
  primaryLabel: string;
  secondaryLabel?: string;
};

export function renderCivixCard(p: CivixCardProps) {
  const inputBar = {
    display: "flex",
    height: 42,
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
            {p.eyebrow}
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
            {p.headline}
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
            {p.subtext}
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
              {p.ctaLabel}
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
              {p.urlLabel}
            </div>
          </div>
        </div>

        {/* Right — form mock */}
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
            {p.panelKicker}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 32,
              fontWeight: 800,
              color: "#0f172a",
              marginTop: 8,
            }}
          >
            {p.panelTitle}
          </div>

          {p.fields.map((label) => (
            <div
              key={label}
              style={{ display: "flex", flexDirection: "column", marginTop: 14 }}
            >
              <div style={{ display: "flex", fontSize: 15, color: "#64748b" }}>
                {label}
              </div>
              <div style={inputBar} />
            </div>
          ))}

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
              marginTop: 22,
            }}
          >
            {p.primaryLabel}
          </div>
          {p.secondaryLabel ? (
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
              {p.secondaryLabel}
            </div>
          ) : null}
        </div>
      </div>
    ),
    { ...OG_SIZE }
  );
}
