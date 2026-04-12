import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

type RecommendedAction = "Approve" | "Review" | "Block";

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}

function scoreTextFallback(text: string) {
  const lower = text.toLowerCase();

  let toxicity = 0.05;
  let spam = 0.05;
  let misinformation = 0.05;

  const toxicWords = ["idiot", "stupid", "hate", "kill", "trash", "moron"];
  const spamWords = ["buy now", "click here", "free money", "limited offer"];
  const misinformationWords = ["government conspiracy", "fake cure", "microchip"];

  toxicWords.forEach((word) => {
    if (lower.includes(word)) toxicity += 0.18;
  });

  spamWords.forEach((word) => {
    if (lower.includes(word)) spam += 0.2;
  });

  misinformationWords.forEach((word) => {
    if (lower.includes(word)) misinformation += 0.22;
  });

  toxicity = clamp01(toxicity);
  spam = clamp01(spam);
  misinformation = clamp01(misinformation);

  let recommendedAction: RecommendedAction = "Approve";

  if (toxicity >= 0.75 || spam >= 0.75 || misinformation >= 0.75) {
    recommendedAction = "Block";
  } else if (toxicity >= 0.35 || spam >= 0.35 || misinformation >= 0.35) {
    recommendedAction = "Review";
  }

  return {
    source: "fallback",
    toxicity,
    spam,
    misinformation,
    recommendedAction,
    flaggedReason:
      recommendedAction === "Block"
        ? "keyword_block"
        : recommendedAction === "Review"
        ? "keyword_review"
        : null,
  };
}

function getMaxScore(
  scores: Record<string, number | undefined>,
  keys: string[]
) {
  return clamp01(
    Math.max(...keys.map((key) => Number(scores[key] ?? 0)), 0)
  );
}

function mapOpenAIResult(result: any) {
  const scores = (result?.category_scores ?? {}) as Record<string, number | undefined>;
  const categories = (result?.categories ?? {}) as Record<string, boolean | undefined>;

  const toxicity = getMaxScore(scores, [
    "harassment",
    "harassment/threatening",
    "hate",
    "hate/threatening",
    "violence",
    "violence/graphic",
    "self-harm",
    "self-harm/intent",
    "self-harm/instructions",
  ]);

  const spam = getMaxScore(scores, [
    "illicit",
    "illicit/violent",
  ]);

  // OpenAI moderation does not provide a native "misinformation" category.
  const misinformation = 0.05;

  let recommendedAction: RecommendedAction = "Approve";
  const maxScore = Math.max(toxicity, spam, misinformation);

  if (maxScore >= 0.85) {
    recommendedAction = "Block";
  } else if (maxScore >= 0.35 || result?.flagged) {
    recommendedAction = "Review";
  }

  const flaggedCategories = Object.entries(categories)
    .filter(([, value]) => Boolean(value))
    .map(([key]) => key);

  return {
    source: "openai",
    toxicity,
    spam,
    misinformation,
    recommendedAction,
    flaggedReason: flaggedCategories.length > 0 ? flaggedCategories.join(", ") : null,
    raw: {
      flagged: Boolean(result?.flagged),
      categories,
      category_scores: scores,
    },
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const title = typeof body.title === "string" ? body.title : "";
    const description = typeof body.description === "string" ? body.description : "";
    const content = typeof body.content === "string" ? body.content : "";

    const combinedText = `${title} ${description} ${content}`.trim();

    if (!combinedText) {
      return NextResponse.json(
        { error: "Title, description, or content is required." },
        { status: 400 }
      );
    }

    if (!openai) {
      return NextResponse.json(scoreTextFallback(combinedText));
    }

    try {
      const moderation = await openai.moderations.create({
        model: "omni-moderation-latest",
        input: combinedText,
      });

      const result = moderation.results?.[0];
      return NextResponse.json(mapOpenAIResult(result));
    } catch (error) {
      console.error("OpenAI moderation failed, using fallback:", error);
      return NextResponse.json(scoreTextFallback(combinedText));
    }
  } catch (error) {
    console.error("Failed to moderate content:", error);
    return NextResponse.json(
      { error: "Failed to moderate content." },
      { status: 500 }
    );
  }
}