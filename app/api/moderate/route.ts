import { NextResponse } from "next/server";
import { moderateContent } from "@/lib/moderation";

export async function GET() {
  return NextResponse.json({
    message: "Moderation API is running. Use POST to analyze content.",
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, description } = body || {};

    const result = moderateContent({ title, description });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Moderation API error:", error);
    return NextResponse.json(
      { error: "Failed to analyze content." },
      { status: 500 }
    );
  }
}