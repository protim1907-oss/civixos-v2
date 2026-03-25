export type ModerationAction = "APPROVE" | "REVIEW" | "WARN" | "BLOCK";

export type ModerationResult = {
  toxicityScore: number;
  spamScore: number;
  misinformationScore: number;
  action: ModerationAction;
  reasons: string[];
};

function clamp(num: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, num));
}

function countMatches(text: string, patterns: RegExp[]) {
  return patterns.reduce((count, pattern) => {
    const matches = text.match(pattern);
    return count + (matches ? matches.length : 0);
  }, 0);
}

export function moderateContent(input: {
  title?: string;
  description?: string;
}): ModerationResult {
  const title = (input.title || "").trim();
  const description = (input.description || "").trim();
  const rawText = `${title} ${description}`.trim();
  const text = rawText.toLowerCase();

  const reasons: string[] = [];

  const toxicPatterns = [
    /\bidiot\b/g,
    /\bidiots\b/g,
    /\bstupid\b/g,
    /\bdumb\b/g,
    /\bshut up\b/g,
    /\bhate you\b/g,
    /\bkill\b/g,
    /\btrash\b/g,
    /\bmoron\b/g,
    /\bcorrupt\b/g,
    /\bloser\b/g,
    /\bpathetic\b/g,
    /\bworthless\b/g,
    /\bscum\b/g,
    /\bjerk\b/g,
    /\bfool\b/g,
  ];

  const spamPatterns = [
    /\bbuy now\b/g,
    /\bclick here\b/g,
    /\bfree money\b/g,
    /\bguaranteed\b/g,
    /\bwin cash\b/g,
    /\bvisit my profile\b/g,
    /\bpromo\b/g,
    /\bdiscount\b/g,
    /\blimited time\b/g,
    /\bact now\b/g,
    /\bearn \$?\d+\b/g,
    /\bhttp[s]?:\/\/\S+/g,
    /\bwww\.\S+/g,
  ];

  const misinformationPatterns = [
    /\b100% proven\b/g,
    /\beveryone knows\b/g,
    /\bdefinitely true\b/g,
    /\bsecret cure\b/g,
    /\bthey are hiding the truth\b/g,
    /\bconfirmed fraud without evidence\b/g,
    /\bstolen election\b/g,
    /\bgovernment conspiracy\b/g,
    /\bfake virus\b/g,
    /\bundeniable proof\b/g,
    /\bno doubt\b/g,
    /\bthey don't want you to know\b/g,
  ];

  const suspicionPatterns = [
    /\bi think\b/g,
    /\bmay be hiding\b/g,
    /\bseems like\b/g,
    /\bit appears\b/g,
    /\bsomething is off\b/g,
    /\bneeds investigation\b/g,
    /\bnot transparent\b/g,
    /\bpossible issue\b/g,
    /\bunclear\b/g,
    /\bno clarity\b/g,
  ];

  let toxicityScore = 0;
  let spamScore = 0;
  let misinformationScore = 0;

  // Toxicity scoring
  const toxicCount = countMatches(text, toxicPatterns);
  toxicityScore += toxicCount * 28;

  if (/\bthese idiots\b/g.test(text) || /\byou idiots\b/g.test(text)) {
    toxicityScore += 20;
    reasons.push("Direct insulting phrasing detected.");
  }

  if (/[A-Z]{5,}/.test(rawText)) {
    toxicityScore += 10;
    reasons.push("Excessive all-caps language detected.");
  }

  const exclamations = (rawText.match(/!/g) || []).length;
  if (exclamations >= 3) {
    toxicityScore += 18;
    reasons.push("Aggressive punctuation detected.");
  }

  if (toxicCount > 0) {
    reasons.push("Potential abusive or hostile language detected.");
  }

  // Spam scoring
  const spamCount = countMatches(text, spamPatterns);
  spamScore += spamCount * 18;

  const urlMatches = rawText.match(/http[s]?:\/\/\S+|www\.\S+/g) || [];
  if (urlMatches.length >= 2) {
    spamScore += 20;
    reasons.push("Multiple external links detected.");
  }

  const words = rawText.toLowerCase().split(/\s+/).filter(Boolean);
  const frequencyMap: Record<string, number> = {};

  for (const word of words) {
    frequencyMap[word] = (frequencyMap[word] || 0) + 1;
  }

  const repeatedWords = Object.values(frequencyMap).some((count) => count >= 5);
  if (repeatedWords) {
    spamScore += 15;
    reasons.push("Repeated wording suggests spam-like behavior.");
  }

  if (spamCount > 0) {
    reasons.push("Promotional or spam-like wording detected.");
  }

  // Misinformation scoring
  const misinfoCount = countMatches(text, misinformationPatterns);
  misinformationScore += misinfoCount * 20;

  if (misinfoCount > 0) {
    reasons.push("Potential misleading or unverified claim patterns detected.");
  }

  // Suspicion / allegation scoring
  const suspicionCount = countMatches(text, suspicionPatterns);
  if (suspicionCount > 0) {
    misinformationScore += suspicionCount * 12;
    reasons.push("Potential unverified or speculative claim detected.");
  }

  // Short/low-context content adjustment
  if (description.length < 12) {
    spamScore += 8;
    reasons.push("Very short description may require review.");
  }

  toxicityScore = clamp(toxicityScore);
  spamScore = clamp(spamScore);
  misinformationScore = clamp(misinformationScore);

  // Final decision
  let action: ModerationAction = "APPROVE";
  const maxRisk = Math.max(toxicityScore, spamScore, misinformationScore);

  if (toxicityScore >= 80 || spamScore >= 80 || misinformationScore >= 80) {
    action = "BLOCK";
  } else if (
    toxicityScore >= 45 ||
    spamScore >= 55 ||
    misinformationScore >= 55
  ) {
    action = "WARN";
  } else if (
    maxRisk >= 20 ||
    (misinformationScore >= 15 && toxicityScore < 30)
  ) {
    action = "REVIEW";
  } else {
    action = "APPROVE";
  }

  if (reasons.length === 0) {
    reasons.push("No major moderation risks detected.");
  }

  return {
    toxicityScore,
    spamScore,
    misinformationScore,
    action,
    reasons,
  };
}