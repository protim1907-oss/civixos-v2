import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const src = req.nextUrl.searchParams.get("src");

  if (!src) {
    return new Response("Missing src", { status: 400 });
  }

  try {
    const decoded = decodeURIComponent(src);
    const safeUrl = decoded.startsWith("http://")
      ? decoded.replace("http://", "https://")
      : decoded;

    const upstream = await fetch(safeUrl, {
      headers: {
        Accept: "image/*,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0 Civix250/1.0",
      },
      cache: "force-cache",
    });

    if (!upstream.ok) {
      return new Response("Image fetch failed", { status: 404 });
    }

    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    const buffer = await upstream.arrayBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=604800, s-maxage=604800",
      },
    });
  } catch {
    return new Response("Bad image request", { status: 400 });
  }
}