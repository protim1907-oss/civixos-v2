import { NextResponse } from "next/server";

function scoreText(text: string) {
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

  toxicity = Math.min(Number(toxicity.toFixed(2)), 1);
  spam = Math.min(Number(spam.toFixed(2)), 1);
  misinformation = Math.min(Number(misinformation.toFixed(2)), 1);

  let recommendedAction: "Approve" | "Review" | "Block" = "Approve";

  if (toxicity >= 0.75 || spam >= 0.75 || misinformation >= 0.75) {
    recommendedAction = "Block";
  } else if (toxicity >= 0.35 || spam >= 0.35 || misinformation >= 0.35) {
    recommendedAction = "Review";
  }

  return {
    toxicity,
    spam,
    misinformation,
    recommendedAction,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const title = typeof body.title === "string" ? body.title : "";
    const description = typeof body.description === "string" ? body.description : "";
    const combinedText = `${title} ${description}`.trim();

    if (!combinedText) {
      return NextResponse.json(
        { error: "Title and description are required." },
        { status: 400 }
      );
    }

    return NextResponse.json(scoreText(combinedText));
  } catch {
    return NextResponse.json(
      { error: "Failed to moderate content." },
      { status: 500 }
    );
  }
}