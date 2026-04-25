export type PolicyPulseUploadedFile = {
  name: string;
  size: string;
  type: string;
};

export type VoteOption =
  | "Strongly Support"
  | "Support"
  | "Neutral"
  | "Oppose"
  | "Strongly Oppose";

export type PolicyPulseResponse = {
  id: string;
  citizenLabel: string;
  supportLevel: VoteOption;
  topConcern: string;
  recommendation: string;
  createdAt: string;
};

export type PolicyPulseSurvey = {
  id: string;
  title: string;
  district: string;
  createdByUserId: string | null;
  createdByName: string;
  summary: string;
  primaryQuestion: string;
  deadline: string;
  uploadedFiles: PolicyPulseUploadedFile[];
  createdAt: string;
  votes: Record<VoteOption, number>;
  recentResponses: PolicyPulseResponse[];
};

export const POLICY_PULSE_STORAGE_KEY = "policy-pulse-surveys";

export const voteOptions: VoteOption[] = [
  "Strongly Support",
  "Support",
  "Neutral",
  "Oppose",
  "Strongly Oppose",
];

export const initialVotes: Record<VoteOption, number> = {
  "Strongly Support": 24,
  Support: 18,
  Neutral: 9,
  Oppose: 6,
  "Strongly Oppose": 3,
};

export function loadPolicyPulseSurveys(): PolicyPulseSurvey[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(POLICY_PULSE_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PolicyPulseSurvey[]) : [];
  } catch (error) {
    console.error("Failed to load policy pulse surveys:", error);
    return [];
  }
}

export function savePolicyPulseSurveys(surveys: PolicyPulseSurvey[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(POLICY_PULSE_STORAGE_KEY, JSON.stringify(surveys));
}

export function upsertPolicyPulseSurvey(survey: PolicyPulseSurvey) {
  const current = loadPolicyPulseSurveys();
  const next = [survey, ...current.filter((item) => item.id !== survey.id)];
  savePolicyPulseSurveys(next);
  return next;
}
