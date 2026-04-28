import type { SupabaseClient } from "@supabase/supabase-js";

export type PolicyPulseUploadedFile = {
  name: string;
  size: string;
  type: string;
  path?: string;
  url?: string;
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
export const POLICY_PULSE_FILES_BUCKET = "policy-pulse-files";

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

type PolicyPulseSurveyRow = {
  id: string;
  title: string;
  district: string;
  created_by_user_id: string | null;
  created_by_name: string | null;
  summary: string;
  primary_question: string;
  deadline: string;
  uploaded_files: PolicyPulseUploadedFile[] | null;
  created_at: string;
  votes: Record<VoteOption, number> | null;
  recent_responses: PolicyPulseResponse[] | null;
};

function normalizeVotes(value: Record<VoteOption, number> | null | undefined) {
  return {
    ...initialVotes,
    ...(value ?? {}),
  };
}

function mapSurveyRow(row: PolicyPulseSurveyRow): PolicyPulseSurvey {
  return {
    id: row.id,
    title: row.title,
    district: row.district,
    createdByUserId: row.created_by_user_id,
    createdByName: row.created_by_name || "Survey Creator",
    summary: row.summary,
    primaryQuestion: row.primary_question,
    deadline: row.deadline,
    uploadedFiles: row.uploaded_files ?? [],
    createdAt: row.created_at,
    votes: normalizeVotes(row.votes),
    recentResponses: row.recent_responses ?? [],
  };
}

function toSurveyInsert(survey: PolicyPulseSurvey) {
  return {
    id: survey.id,
    title: survey.title,
    district: survey.district,
    created_by_user_id: survey.createdByUserId,
    created_by_name: survey.createdByName,
    summary: survey.summary,
    primary_question: survey.primaryQuestion,
    deadline: survey.deadline,
    uploaded_files: survey.uploadedFiles,
    created_at: survey.createdAt,
    votes: survey.votes,
    recent_responses: survey.recentResponses,
  };
}

export async function loadPublishedPolicyPulseSurveys(
  supabase: SupabaseClient
): Promise<PolicyPulseSurvey[]> {
  const { data, error } = await supabase
    .from("policy_pulse_surveys")
    .select(
      "id, title, district, created_by_user_id, created_by_name, summary, primary_question, deadline, uploaded_files, created_at, votes, recent_responses"
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load published policy pulse surveys:", error);
    return loadPolicyPulseSurveys();
  }

  return ((data ?? []) as PolicyPulseSurveyRow[]).map(mapSurveyRow);
}

export async function publishPolicyPulseSurvey(
  supabase: SupabaseClient,
  survey: PolicyPulseSurvey
) {
  const { error } = await supabase
    .from("policy_pulse_surveys")
    .upsert(toSurveyInsert(survey), { onConflict: "id" });

  if (error) {
    throw error;
  }

  upsertPolicyPulseSurvey(survey);
}

export async function updatePublishedPolicyPulseSurvey(
  supabase: SupabaseClient,
  survey: PolicyPulseSurvey
) {
  const { error } = await supabase
    .from("policy_pulse_surveys")
    .update({
      votes: survey.votes,
      recent_responses: survey.recentResponses,
    })
    .eq("id", survey.id);

  if (error) {
    throw error;
  }

  const localSurveys = loadPolicyPulseSurveys();
  const nextSurveys = localSurveys.some((item) => item.id === survey.id)
    ? localSurveys.map((item) => (item.id === survey.id ? survey : item))
    : [survey, ...localSurveys];

  savePolicyPulseSurveys(nextSurveys);
}

export async function uploadPolicyPulseFiles(
  supabase: SupabaseClient,
  surveyId: string,
  files: File[]
): Promise<PolicyPulseUploadedFile[]> {
  const uploadedFiles: PolicyPulseUploadedFile[] = [];

  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${surveyId}/${Date.now()}-${safeName}`;

    const { error } = await supabase.storage
      .from(POLICY_PULSE_FILES_BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw error;
    }

    const { data } = supabase.storage
      .from(POLICY_PULSE_FILES_BUCKET)
      .getPublicUrl(path);

    uploadedFiles.push({
      name: file.name,
      size: `${(file.size / 1024).toFixed(1)} KB`,
      type: file.type || "Unknown file type",
      path,
      url: data.publicUrl,
    });
  }

  return uploadedFiles;
}
