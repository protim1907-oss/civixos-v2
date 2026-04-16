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

const DISTRICT_OFFICIALS: Record<string, Official> = {
  "TX-35": {
    id: "greg-casar",
    name: "Greg Casar",
    title: "U.S. Representative",
    officeLabel: "Texas 35th Congressional District",
    level: "federal",
    district: "TX-35",
    state: "Texas",
    party: "Democrat",
    website: "https://casar.house.gov",
    contactUrl: "https://casar.house.gov/contact/offices",
    phone: "(202) 225-5645",
    imageUrl: "/officials/greg-casar.jpg",
    badge: {
      text: "House",
      tone: "blue",
    },
  },
};

const TEXAS_STATEWIDE_LEADERS: Official[] = [
  {
    id: "ted-cruz",
    name: "Ted Cruz",
    title: "U.S. Senator",
    officeLabel: "Texas",
    level: "federal",
    state: "Texas",
    website: "https://www.cruz.senate.gov",
    contactUrl: "https://www.cruz.senate.gov/contact/write-ted",
    phone: "(512) 916-5834",
    imageUrl: "/officials/ted-cruz.jpg",
    badge: {
      text: "Senate",
      tone: "red",
    },
  },
  {
    id: "greg-abbott",
    name: "Greg Abbott",
    title: "Governor of Texas",
    officeLabel: "Statewide Office",
    level: "state",
    state: "Texas",
    website: "https://gov.texas.gov/",
    contactUrl: "https://gov.texas.gov/contact",
    phone: "(512) 463-2000",
    imageUrl: "/officials/greg-abbott.jpg",
    badge: {
      text: "State",
      tone: "green",
    },
  },
  {
    id: "ken-paxton",
    name: "Ken Paxton",
    title: "Attorney General of Texas",
    officeLabel: "Statewide Office",
    level: "state",
    state: "Texas",
    website: "https://www.texasattorneygeneral.gov/",
    contactUrl: "https://www.texasattorneygeneral.gov/about-office",
    imageUrl: "/officials/ken-paxton.jpg",
    badge: {
      text: "State",
      tone: "green",
    },
  },
];

function normalizeDistrict(rawValue: string | null | undefined): string {
  if (!rawValue) return "TX-35";

  const raw = String(rawValue).trim().toUpperCase();

  if (raw === "TX-35") return "TX-35";
  if (raw === "35") return "TX-35";
  if (raw === "DISTRICT 35") return "TX-35";
  if (raw === "TEXAS DISTRICT 35") return "TX-35";
  if (raw === "TEXAS-35") return "TX-35";
  if (raw === "TEXAS 35") return "TX-35";
  if (raw === "CD-35") return "TX-35";
  if (raw === "TX35") return "TX-35";

  const txMatch = raw.match(/TX[\s-]?(\d{1,2})/);
  if (txMatch?.[1]) return `TX-${txMatch[1]}`;

  const districtMatch = raw.match(/DISTRICT[\s-]?(\d{1,2})/);
  if (districtMatch?.[1]) return `TX-${districtMatch[1]}`;

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

export default function MyRepresentativePage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [district, setDistrict] = useState("TX-35");

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
          .select("id, full_name, email, role, district, state")
          .eq("id", user.id)
          .single();

        if (!mounted) return;

        const mergedDistrict =
          profileRow?.district ||
          (user.user_metadata?.district as string | undefined) ||
          (user.user_metadata?.district_name as string | undefined) ||
          (user.user_metadata?.district_id as string | undefined) ||
          "TX-35";

        setProfile(profileRow ?? null);
        setDistrict(normalizeDistrict(mergedDistrict));
      } catch (error) {
        console.error("Failed to load representative page:", error);
        setDistrict("TX-35");
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
    return DISTRICT_OFFICIALS[district] ?? null;
  }, [district]);

  const statewideLeaders = useMemo(() => {
    return district.startsWith("TX-") ? TEXAS_STATEWIDE_LEADERS : [];
  }, [district]);

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
                    <span className="text-sm text-slate-500">Visible Representatives</span>
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
              {primaryRepresentative && (
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
              )}
            </section>
          </div>

          <section className="mt-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              Statewide Leadership
            </p>
            <h3 className="mt-2 text-2xl font-bold text-slate-900">Texas</h3>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
              {statewideLeaders.map((official) => (
                <OfficialCard
                  key={official.id}
                  official={official}
                  wide
                  onChat={startChat}
                />
              ))}
            </div>
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
  const [imgSrc, setImgSrc] = useState(official.imageUrl);

  useEffect(() => {
    setImgSrc(official.imageUrl);
  }, [official.imageUrl]);

  return (
    <div
      className={`rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm ${
        featured ? "md:p-7" : ""
      } ${wide ? "h-full" : ""}`}
    >
      <div className="flex h-full flex-col items-center text-center">
        <div className="h-36 w-36 overflow-hidden rounded-full border border-slate-200 bg-slate-100 shadow-inner">
          <img
            src={imgSrc}
            alt={official.name}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setImgSrc("/officials/fallback-avatar.jpg")}
          />
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
            href={official.contactUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-4 text-base font-semibold text-slate-800 transition hover:bg-slate-200"
          >
            <Mail className="h-5 w-5" />
            Send Email
          </a>

          <a
            href={official.website}
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