"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Sidebar from "@/components/layout/Sidebar";
import {
  Building2,
  MapPinned,
  MessageCircle,
  ExternalLink,
  Mail,
  Shield,
  X,
  Send,
  Loader2,
  User2,
} from "lucide-react";

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  district: string | null;
  state: string | null;
  city?: string | null;
  zip_code?: string | null;
  street_address?: string | null;
};

type Official = {
  id: string;
  name: string;
  title: string;
  officeLabel: string;
  level: "federal" | "state";
  district?: string;
  state: string;
  party?: string;
  website: string;
  contactUrl: string;
  phone?: string;
  imageUrl: string;
  badge: {
    text: string;
    tone: "red" | "green" | "blue" | "slate";
  };
};

type ChatMessage = {
  id: string;
  sender: "user" | "assistant";
  text: string;
};

type CivicApiResponse = {
  districtRepresentative?: any | null;
  statewideLeaders?: any[];
};

function normalizeStateCode(state?: string | null): string {
  const value = String(state || "").trim().toLowerCase();

  const map: Record<string, string> = {
    texas: "TX",
    tx: "TX",
    "new hampshire": "NH",
    nh: "NH",
    california: "CA",
    ca: "CA",
    florida: "FL",
    fl: "FL",
    "new york": "NY",
    ny: "NY",
  };

  return map[value] || String(state || "").trim().toUpperCase();
}

function normalizeStateName(state?: string | null): string {
  const value = String(state || "").trim().toLowerCase();

  const map: Record<string, string> = {
    texas: "Texas",
    tx: "Texas",
    "new hampshire": "New Hampshire",
    nh: "New Hampshire",
    california: "California",
    ca: "California",
    florida: "Florida",
    fl: "Florida",
    "new york": "New York",
    ny: "New York",
  };

  return map[value] || String(state || "").trim() || "State";
}

function normalizeDistrict(
  rawValue: string | null | undefined,
  state?: string | null
): string {
  const raw = String(rawValue || "").trim().toUpperCase();
  const stateCode = normalizeStateCode(state);

  if (!raw) return stateCode || "N/A";

  if (/^[A-Z]{2}$/.test(raw)) return raw;
  if (/^[A-Z]{2}-\d{1,2}$/.test(raw)) return raw;

  const prefixedMatch = raw.match(/^([A-Z]{2})[\s-]?(\d{1,2})$/);
  if (prefixedMatch?.[1] && prefixedMatch?.[2]) {
    return `${prefixedMatch[1]}-${Number(prefixedMatch[2])}`;
  }

  const numericMatch = raw.match(/(\d{1,2})/);
  if (numericMatch?.[1] && stateCode) {
    return `${stateCode}-${Number(numericMatch[1])}`;
  }

  return raw;
}

function getBadgeClasses(tone: "red" | "green" | "blue" | "slate") {
  switch (tone) {
    case "red":
      return "border-red-200 bg-red-50 text-red-600";
    case "green":
      return "border-green-200 bg-green-50 text-green-700";
    case "blue":
      return "border-blue-200 bg-blue-50 text-blue-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function buildAutoReply(official: Official, userText: string) {
  const text = userText.toLowerCase();

  if (text.includes("meeting") || text.includes("appointment")) {
    return `I can help you prepare a meeting request for ${official.name}. Include your district, the issue you want to discuss, and a few available dates before sending it to the official office.`;
  }

  if (
    text.includes("issue") ||
    text.includes("problem") ||
    text.includes("complaint")
  ) {
    return `A strong message to ${official.name}'s office should clearly explain the issue, who is affected, where it is happening, and the action you want the office to take.`;
  }

  if (text.includes("funding") || text.includes("grant")) {
    return `${official.name}'s office may be able to direct you to the correct federal or state resource. Use the official website or contact page to request constituent services or program guidance.`;
  }

  return `This is a Civix250 drafting assistant for ${official.name}. Share your concern or request, and then send the final version through the official contact page.`;
}

function buildAddress(profile: ProfileRow | null) {
  if (!profile) return "";

  const parts = [
    profile.street_address || "",
    profile.city || "",
    profile.state || "",
    profile.zip_code || "",
  ]
    .map((part) => String(part || "").trim())
    .filter(Boolean);

  return parts.join(", ");
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function isBadgeTone(value: unknown): value is Official["badge"]["tone"] {
  return value === "red" || value === "green" || value === "blue" || value === "slate";
}

function mapCivicOfficial(
  input: any,
  profile: ProfileRow | null,
  district: string
): Official | null {
  if (!input?.name || !input?.title) return null;

  const stateName = normalizeStateName(profile?.state || input?.state || district);

  return {
    id:
      input.id ||
      `${input.name}-${input.title}`.replace(/\s+/g, "-").toLowerCase(),
    name: String(input.name),
    title: String(input.title),
    officeLabel: String(input.officeLabel || district || "District Office"),
    level: input.level === "state" ? "state" : "federal",
    district: district || undefined,
    state: stateName,
    party: input.party ? String(input.party) : undefined,
    website: String(input.website || "#"),
    contactUrl: String(input.contactUrl || input.website || "#"),
    phone: input.phone ? String(input.phone) : undefined,
    imageUrl: String(input.imageUrl || ""),
    badge: {
      text: String(input.badge?.text || "Office"),
      tone: isBadgeTone(input.badge?.tone) ? input.badge.tone : "slate",
    },
  };
}

function dedupeOfficials(items: Official[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.name}-${item.title}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function MyRepresentativePage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [district, setDistrict] = useState("N/A");
  const [dynamicPrimaryRepresentative, setDynamicPrimaryRepresentative] =
    useState<Official | null>(null);
  const [dynamicStatewideLeaders, setDynamicStatewideLeaders] = useState<Official[]>([]);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatOfficial, setChatOfficial] = useState<Official | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    let mounted = true;

    async function loadPage() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.push("/login");
          return;
        }

        const { data: profileRow } = await supabase
          .from("profiles")
          .select(
            "id, full_name, email, role, district, state, city, zip_code, street_address"
          )
          .eq("id", user.id)
          .single();

        if (!mounted) return;

        const mergedProfile = profileRow ?? null;
        setProfile(mergedProfile);

        const rawState =
          mergedProfile?.state ||
          (user.user_metadata?.state as string | undefined) ||
          null;

        const mergedDistrict =
          mergedProfile?.district ||
          (user.user_metadata?.district as string | undefined) ||
          (user.user_metadata?.district_name as string | undefined) ||
          (user.user_metadata?.district_id as string | undefined) ||
          rawState ||
          "N/A";

        const normalizedDistrict = normalizeDistrict(mergedDistrict, rawState);
        setDistrict(normalizedDistrict);

        const mappedStatewide: Official[] = [];
        let mappedPrimary: Official | null = null;

        const address = buildAddress(mergedProfile);

        if (address) {
          try {
            const response = await fetch(
              `/api/representatives?address=${encodeURIComponent(address)}`,
              { cache: "no-store" }
            );

            if (response.ok) {
              const json: CivicApiResponse = await response.json();

              if (!mounted) return;

              mappedPrimary = mapCivicOfficial(
                json?.districtRepresentative,
                mergedProfile,
                normalizedDistrict
              );

              const leaders = Array.isArray(json?.statewideLeaders)
                ? json.statewideLeaders
                    .map((item) =>
                      mapCivicOfficial(item, mergedProfile, normalizedDistrict)
                    )
                    .filter(Boolean) as Official[]
                : [];

              if (mappedPrimary) {
                setDynamicPrimaryRepresentative(mappedPrimary);
              }

              if (leaders.length > 0) {
                mappedStatewide.push(...leaders);
              }
            }
          } catch (error) {
            console.error("Failed to load representatives by address:", error);
          }
        }

        const stateForLookup =
          mergedProfile?.state ||
          (user.user_metadata?.state as string | undefined) ||
          (normalizedDistrict.length === 2 ? normalizedDistrict : normalizedDistrict.split("-")[0]) ||
          "";

        if (stateForLookup) {
          try {
            const response = await fetch(
              `/api/statewide?state=${encodeURIComponent(stateForLookup)}`,
              { cache: "no-store" }
            );

            if (response.ok) {
              const json: CivicApiResponse = await response.json();

              if (!mounted) return;

              const statewide = Array.isArray(json?.statewideLeaders)
                ? json.statewideLeaders
                    .map((item) =>
                      mapCivicOfficial(item, mergedProfile, normalizedDistrict)
                    )
                    .filter(Boolean) as Official[]
                : [];

              if (statewide.length > 0) {
                mappedStatewide.push(...statewide);
              }
            }
          } catch (error) {
            console.error("Failed to load statewide leaders:", error);
          }
        }

        if (mounted) {
          setDynamicStatewideLeaders(dedupeOfficials(mappedStatewide));
        }
      } catch (error) {
        console.error("Failed to load representative page:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadPage();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  const primaryRepresentative = useMemo(() => {
    return dynamicPrimaryRepresentative;
  }, [dynamicPrimaryRepresentative]);

  const statewideLeaders = useMemo(() => {
    return dynamicStatewideLeaders;
  }, [dynamicStatewideLeaders]);

  const visibleRepresentativesCount =
    (primaryRepresentative ? 1 : 0) + statewideLeaders.length;

  function startChat(official: Official) {
    setChatOfficial(official);
    setChatMessages([
      {
        id: "welcome",
        sender: "assistant",
        text: `You are now drafting a constituent message for ${official.name}, ${official.title}. Describe your issue, request, or feedback and I’ll help format it.`,
      },
    ]);
    setChatInput("");
    setChatOpen(true);
  }

  function handleSendChat() {
    if (!chatOfficial || !chatInput.trim() || chatSending) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: chatInput.trim(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setChatSending(true);

    setTimeout(() => {
      const reply: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: "assistant",
        text: buildAutoReply(chatOfficial, userMessage.text),
      };

      setChatMessages((prev) => [...prev, reply]);
      setChatSending(false);
    }, 700);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto flex max-w-[1700px]">
          <Sidebar />
          <main className="flex-1 p-6 md:p-8">
            <div className="flex h-[70vh] items-center justify-center">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                <span className="text-sm font-medium text-slate-600">
                  Loading representative information...
                </span>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const firstName = profile?.full_name?.split(" ")[0] || "Citizen";
  const stateHeading = normalizeStateName(profile?.state || district);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-[1700px]">
        <Sidebar />

        <main className="flex-1 p-6 md:p-8">
          <div className="mb-6 flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">
              Civix250 Representative Hub
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              My Representative
            </h1>
            <p className="max-w-4xl text-sm text-slate-600">
              Federal, state, and statewide leaders relevant to your district are shown
              below. You can review office details, open official websites, and draft a
              constituent message.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.02fr_1.18fr]">
            <section className="space-y-6">
              <div className="rounded-[28px] border border-blue-200 bg-gradient-to-br from-blue-50 to-slate-100 p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-700">
                  District Assignment
                </p>

                <h2 className="mt-3 text-3xl font-bold text-slate-900">
                  {primaryRepresentative
                    ? `${primaryRepresentative.name} is assigned to ${district}`
                    : "Representative assignment pending"}
                </h2>

                <p className="mt-3 max-w-2xl text-base leading-8 text-slate-700">
                  {primaryRepresentative
                    ? `${primaryRepresentative.name} currently serves ${primaryRepresentative.officeLabel}. You can chat with the office, open the official website, or use the contact page to submit a formal message.`
                    : `We are preparing representative information for ${district}.`}
                </p>

                <div className="mt-6 rounded-2xl border border-white/80 bg-white/90 px-5 py-4 text-sm text-slate-700 shadow-sm">
                  {primaryRepresentative
                    ? `${primaryRepresentative.title} • ${primaryRepresentative.officeLabel}`
                    : "Representative details unavailable."}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <MapPinned className="h-5 w-5 text-slate-500" />
                    <span className="text-sm text-slate-500">District</span>
                  </div>
                  <div className="mt-4 text-4xl font-bold tracking-tight text-slate-900">
                    {district}
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-slate-500" />
                    <span className="text-sm text-slate-500">Primary Office</span>
                  </div>
                  <div className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
                    {primaryRepresentative ? primaryRepresentative.name : "Pending"}
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <User2 className="h-5 w-5 text-slate-500" />
                    <span className="text-sm text-slate-500">
                      Visible Representatives
                    </span>
                  </div>
                  <div className="mt-4 text-4xl font-bold tracking-tight text-slate-900">
                    {visibleRepresentativesCount}
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-slate-500" />
                    <span className="text-sm text-slate-500">Citizen</span>
                  </div>
                  <div className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
                    {firstName}
                  </div>
                </div>
              </div>
            </section>

            <section>
              {primaryRepresentative ? (
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                        Assigned District Representative
                      </p>
                      <h3 className="mt-2 text-2xl font-bold text-slate-900">
                        {primaryRepresentative.officeLabel}
                      </h3>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${getBadgeClasses(
                        primaryRepresentative.badge.tone
                      )}`}
                    >
                      {primaryRepresentative.badge.text}
                    </span>
                  </div>

                  <OfficialCard
                    official={primaryRepresentative}
                    featured
                    onChat={startChat}
                  />
                </div>
              ) : (
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                    Assigned District Representative
                  </p>
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-12 text-center text-slate-600">
                    We could not find a district representative for your current profile
                    address yet. Try ensuring your state, city, and ZIP are populated in
                    your profile.
                  </div>
                </div>
              )}
            </section>
          </div>

          <section className="mt-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              Statewide Leadership
            </p>
            <h3 className="mt-2 text-2xl font-bold text-slate-900">
              {stateHeading}
            </h3>

            {statewideLeaders.length > 0 ? (
              <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3 xl:grid-cols-4">
                {statewideLeaders.map((official) => (
                  <OfficialCard
                    key={official.id}
                    official={official}
                    wide
                    onChat={startChat}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-12 text-center text-slate-600">
                No statewide leaders were returned for this state yet.
              </div>
            )}
          </section>
        </main>
      </div>

      {chatOpen && chatOfficial && (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-slate-900/40 p-4 sm:p-6">
          <div className="flex h-[78vh] w-full max-w-xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Constituent Chat
                </p>
                <h4 className="mt-1 text-xl font-bold text-slate-900">
                  {chatOfficial.name}
                </h4>
                <p className="mt-1 text-sm text-slate-600">
                  {chatOfficial.title} • {chatOfficial.officeLabel}
                </p>
              </div>

              <button
                onClick={() => setChatOpen(false)}
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                aria-label="Close chat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 px-5 py-5">
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-7 shadow-sm ${
                      message.sender === "user"
                        ? "bg-blue-600 text-white"
                        : "border border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    {message.text}
                  </div>
                </div>
              ))}

              {chatSending && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Drafting response...
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 bg-white p-4">
              <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-800">
                This is a Civix250 drafting assistant. For formal outreach, use the
                official contact page after preparing your message.
              </div>

              <div className="flex items-end gap-3">
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  rows={3}
                  placeholder={`Write a message for ${chatOfficial.name}...`}
                  className="min-h-[92px] flex-1 resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
                <button
                  onClick={handleSendChat}
                  disabled={!chatInput.trim() || chatSending}
                  className="inline-flex h-[52px] items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OfficialCard({
  official,
  featured = false,
  wide = false,
  onChat,
}: {
  official: Official;
  featured?: boolean;
  wide?: boolean;
  onChat: (official: Official) => void;
}) {
  const [imgSrc, setImgSrc] = useState(official.imageUrl || "");
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImgSrc(official.imageUrl || "");
    setImageFailed(false);
  }, [official.imageUrl]);

  return (
    <div
      className={`rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm ${
        featured ? "md:p-7" : ""
      } ${wide ? "h-full" : ""}`}
    >
      <div className="flex h-full flex-col items-center text-center">
        <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 shadow-inner">
          {imgSrc && !imageFailed ? (
            <img
              src={imgSrc}
              alt={official.name}
              className="h-full w-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <span className="text-4xl font-bold text-slate-500">
              {getInitials(official.name)}
            </span>
          )}
        </div>

        <span
          className={`mt-5 rounded-full border px-3 py-1 text-xs font-semibold ${getBadgeClasses(
            official.badge.tone
          )}`}
        >
          {official.badge.text}
        </span>

        <h4 className="mt-5 text-3xl font-bold tracking-tight text-slate-900">
          {official.name}
        </h4>

        <p className="mt-2 text-lg text-slate-700">{official.title}</p>
        <p className="mt-1 text-base text-slate-500">{official.officeLabel}</p>

        {official.phone ? (
          <p className="mt-3 text-sm font-medium text-slate-600">{official.phone}</p>
        ) : null}

        <div className="mt-6 flex w-full flex-col gap-3">
          <button
            onClick={() => onChat(official)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-4 text-base font-semibold text-white transition hover:bg-blue-700"
          >
            <MessageCircle className="h-5 w-5" />
            Chat with Representative
          </button>

          <a
            href={official.contactUrl || official.website || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-4 text-base font-semibold text-slate-800 transition hover:bg-slate-200"
          >
            <Mail className="h-5 w-5" />
            Send Email
          </a>

          <a
            href={official.website || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-4 text-base font-semibold text-slate-800 transition hover:bg-slate-200"
          >
            <ExternalLink className="h-5 w-5" />
            Official Website
          </a>
        </div>
      </div>
    </div>
  );
}