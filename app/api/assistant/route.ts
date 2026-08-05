import { NextResponse } from "next/server";
import OpenAI from "openai";
import { CIVIX_SYSTEM_PROMPT } from "@/lib/chatbot/knowledge";

export const runtime = "nodejs";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const MODEL = process.env.ASSISTANT_MODEL || "gpt-4.1-mini";
const MAX_HISTORY = 10; // cap the conversation we send upstream

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(request: Request) {
  let body: { messages?: ChatMessage[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const history = Array.isArray(body.messages) ? body.messages : [];
  const cleaned = history
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim()
    )
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

  if (cleaned.length === 0 || cleaned[cleaned.length - 1].role !== "user") {
    return NextResponse.json({ error: "A user message is required." }, { status: 400 });
  }

  if (!openai) {
    return NextResponse.json({
      reply:
        "The assistant isn't configured right now. In the meantime, explore the sidebar — Dashboard, Policy Pulse, My Representative, and Community Chat — or reach out to the Civix250 team for help.",
    });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.3,
      max_tokens: 400,
      messages: [
        { role: "system", content: CIVIX_SYSTEM_PROMPT },
        ...cleaned,
      ],
    });

    const reply =
      completion.choices[0]?.message?.content?.trim() ||
      "Sorry, I couldn't come up with an answer. Try rephrasing, or explore the sidebar to find what you need.";

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Assistant error:", error);
    return NextResponse.json(
      { error: "The assistant is temporarily unavailable. Please try again." },
      { status: 502 }
    );
  }
}
