"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Video,
  XCircle,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import { createClient } from "@/lib/supabase/client";

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  district: string | null;
};

type MeetingRow = {
  id: string;
  citizen_id: string | null;
  citizen_name: string | null;
  citizen_email: string | null;
  district: string | null;
  representative_name: string;
  representative_title: string | null;
  representative_office: string | null;
  topic: string;
  preferred_times: string;
  notes: string | null;
  status: "pending" | "approved" | "rejected" | "completed";
  meeting_url: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string | null;
};

type TownHallRow = {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  district: string | null;
  meeting_url: string;
  created_by: string | null;
  created_at: string | null;
};

function buildTownHallUrl(id: string) {
  const token = id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 18);
  return `https://meet.jit.si/civix250-townhall-${token}`;
}

function formatTownHallDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function isOfficialRole(role?: string | null) {
  const normalized = String(role || "").trim().toLowerCase();
  return normalized === "official" || normalized === "admin" || normalized === "moderator";
}

function normalizeDistrict(value?: string | null) {
  return String(value || "").trim().toUpperCase();
}

function districtMatchesScope(value: string | null | undefined, scope: string) {
  const district = normalizeDistrict(value);
  const normalizedScope = normalizeDistrict(scope);

  if (!normalizedScope || normalizedScope === "ALL") return true;
  if (!district) return false;
  if (district === normalizedScope) return true;
  if (!normalizedScope.includes("-")) return district.startsWith(`${normalizedScope}-`);
  return false;
}

function formatDate(value?: string | null) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function buildMeetingUrl(requestId: string) {
  const token = requestId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 18);
  return `https://meet.jit.si/civix250-${token}`;
}

export default function OfficialMeetingsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [districtScope, setDistrictScope] = useState("");
  const [meetings, setMeetings] = useState<MeetingRow[]>([]);
  const [filter, setFilter] = useState<"all" | MeetingRow["status"]>("all");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  // Town Hall Calendar state
  const [townHalls, setTownHalls] = useState<TownHallRow[]>([]);
  const [townHallForm, setTownHallForm] = useState({
    title: "",
    description: "",
    scheduled_at: "",
  });
  const [townHallSubmitting, setTownHallSubmitting] = useState(false);
  const [townHallMessage, setTownHallMessage] = useState("");
  const [showTownHallForm, setShowTownHallForm] = useState(false);

  const loadMeetings = useCallback(async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.replace("/login");
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, district")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Official meeting profile error:", profileError.message);
    }

    const officialProfile = (profileData as ProfileRow | null) ?? null;
    const metadataRole =
      (user.user_metadata?.role as string | undefined) ||
      (user.user_metadata?.account_type as string | undefined) ||
      "";

    if (!isOfficialRole(officialProfile?.role || metadataRole)) {
      router.replace("/dashboard");
      return;
    }

    const scope = normalizeDistrict(
      officialProfile?.district ||
        (user.user_metadata?.district_id as string | undefined) ||
        (user.user_metadata?.district as string | undefined) ||
        (user.user_metadata?.jurisdiction as string | undefined) ||
        "All"
    );

    const { data, error } = await supabase
      .from("video_meeting_requests")
      .select(
        "id, citizen_id, citizen_name, citizen_email, district, representative_name, representative_title, representative_office, topic, preferred_times, notes, status, meeting_url, reviewed_by, reviewed_at, created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Official meetings load error:", error.message);
      setMessage("Unable to load meeting requests.");
      return;
    }

    setProfile(officialProfile);
    setDistrictScope(scope || "All");
    setMeetings(((data as MeetingRow[]) || []).filter((item) => districtMatchesScope(item.district, scope)));
  }, [router, supabase]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        await Promise.all([loadMeetings(), loadTownHalls()]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();

    const channel = supabase
      .channel("official-meetings-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "video_meeting_requests" },
        () => {
          void loadMeetings();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [loadMeetings, loadTownHalls, supabase]);

  async function refresh() {
    try {
      setRefreshing(true);
      await loadMeetings();
    } finally {
      setRefreshing(false);
    }
  }

  async function updateMeetingStatus(meeting: MeetingRow, status: MeetingRow["status"]) {
    try {
      setActionLoadingId(meeting.id);
      setMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("video_meeting_requests")
        .update({
          status,
          meeting_url: status === "approved" ? meeting.meeting_url || buildMeetingUrl(meeting.id) : meeting.meeting_url,
          reviewed_by: user?.id || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", meeting.id);

      if (error) {
        console.error("Official meeting status update error:", error.message);
        setMessage(error.message || "Unable to update meeting request.");
        return;
      }

      setMessage(
        status === "approved"
          ? "Meeting approved and video link created."
          : status === "completed"
          ? "Meeting marked complete."
          : status === "rejected"
          ? "Meeting request rejected."
          : "Meeting updated."
      );
      await loadMeetings();
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const loadTownHalls = useCallback(async () => {
    const { data, error } = await supabase
      .from("town_halls")
      .select("id, title, description, scheduled_at, district, meeting_url, created_by, created_at")
      .order("scheduled_at", { ascending: true });

    if (!error) {
      setTownHalls((data as TownHallRow[]) || []);
    }
  }, [supabase]);

  async function submitTownHall() {
    if (!townHallForm.title.trim() || !townHallForm.scheduled_at) {
      setTownHallMessage("Title and date/time are required.");
      return;
    }

    try {
      setTownHallSubmitting(true);
      setTownHallMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: inserted, error } = await supabase
        .from("town_halls")
        .insert({
          title: townHallForm.title.trim(),
          description: townHallForm.description.trim() || null,
          scheduled_at: new Date(townHallForm.scheduled_at).toISOString(),
          district: districtScope === "ALL" ? null : districtScope,
          created_by: user?.id || null,
          meeting_url: "",
        })
        .select("id")
        .single();

      if (error) {
        setTownHallMessage(error.message || "Failed to schedule town hall.");
        return;
      }

      // Update with the generated Jitsi URL using the new row id
      const url = buildTownHallUrl(inserted.id);
      await supabase.from("town_halls").update({ meeting_url: url }).eq("id", inserted.id);

      setTownHallForm({ title: "", description: "", scheduled_at: "" });
      setShowTownHallForm(false);
      setTownHallMessage("Town hall scheduled successfully.");
      await loadTownHalls();
    } finally {
      setTownHallSubmitting(false);
    }
  }

  async function deleteTownHall(id: string) {
    const { error } = await supabase.from("town_halls").delete().eq("id", id);
    if (!error) await loadTownHalls();
  }

  const visibleMeetings = useMemo(() => {
    if (filter === "all") return meetings;
    return meetings.filter((meeting) => meeting.status === filter);
  }, [filter, meetings]);

  const counts = useMemo(
    () => ({
      pending: meetings.filter((meeting) => meeting.status === "pending").length,
      approved: meetings.filter((meeting) => meeting.status === "approved").length,
      completed: meetings.filter((meeting) => meeting.status === "completed").length,
      rejected: meetings.filter((meeting) => meeting.status === "rejected").length,
    }),
    [meetings]
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <p className="text-2xl font-bold text-slate-950">Loading meetings...</p>
          <p className="mt-2 text-slate-500">Preparing official meeting requests.</p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 lg:flex">
      <Sidebar />

      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Official Meetings
                </p>
                <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-slate-950">
                  Citizen Video Meetings
                </h1>
                <p className="mt-3 max-w-3xl text-lg text-slate-600">
                  Review requests, create video links, and track completed sessions for{" "}
                  <span className="font-semibold text-slate-900">
                    {districtScope === "ALL" ? "all districts" : districtScope}
                  </span>
                  .
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Signed in as {profile?.full_name || profile?.email || "Official"}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={refresh}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                  Refresh
                </button>
                <button
                  onClick={handleLogout}
                  className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  Logout
                </button>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-4">
            <Metric label="Pending" value={counts.pending} tone="amber" />
            <Metric label="Approved" value={counts.approved} tone="blue" />
            <Metric label="Completed" value={counts.completed} tone="green" />
            <Metric label="Rejected" value={counts.rejected} tone="red" />
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {(["all", "pending", "approved", "completed", "rejected"] as const).map((item) => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold capitalize transition ${
                    filter === item
                      ? "bg-slate-950 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </section>

          {message ? (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-700">
              {message}
            </div>
          ) : null}

          <section className="space-y-4">
            {visibleMeetings.length ? (
              visibleMeetings.map((meeting) => (
                <article key={meeting.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          {meeting.status}
                        </span>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          {meeting.district || districtScope}
                        </span>
                      </div>
                      <h2 className="mt-3 text-2xl font-bold text-slate-950">{meeting.topic}</h2>
                      <p className="mt-2 text-sm text-slate-500">
                        Requested by {meeting.citizen_name || "Citizen"}{" "}
                        {meeting.citizen_email ? `(${meeting.citizen_email})` : ""} on{" "}
                        {formatDate(meeting.created_at)}
                      </p>
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <InfoBlock label="Preferred times" text={meeting.preferred_times} />
                        <InfoBlock
                          label="Representative"
                          text={`${meeting.representative_name}${
                            meeting.representative_title ? `, ${meeting.representative_title}` : ""
                          }`}
                        />
                      </div>
                      {meeting.notes ? (
                        <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                          {meeting.notes}
                        </p>
                      ) : null}
                      {meeting.meeting_url ? (
                        <a
                          href={meeting.meeting_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600"
                        >
                          <Video className="h-4 w-4" />
                          Open video room
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2 xl:w-64">
                      <button
                        disabled={actionLoadingId === meeting.id || meeting.status !== "pending"}
                        onClick={() => updateMeetingStatus(meeting, "approved")}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approve
                      </button>
                      <button
                        disabled={actionLoadingId === meeting.id || meeting.status === "completed"}
                        onClick={() => updateMeetingStatus(meeting, "completed")}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Complete
                      </button>
                      <button
                        disabled={actionLoadingId === meeting.id || meeting.status !== "pending"}
                        onClick={() => updateMeetingStatus(meeting, "rejected")}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
                <CalendarClock className="mx-auto h-10 w-10 text-slate-400" />
                <p className="mt-4 text-xl font-bold text-slate-950">No meetings found</p>
                <p className="mt-2 text-slate-500">Requests matching this filter will appear here.</p>
              </div>
            )}
          </section>
          {/* Town Hall Calendar */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Town Hall Calendar
                </p>
                <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">
                  Scheduled Town Halls
                </h2>
              </div>
              <button
                onClick={() => setShowTownHallForm((v) => !v)}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                <Plus className="h-4 w-4" />
                Schedule Town Hall
              </button>
            </div>

            {showTownHallForm && (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-bold text-slate-900">New Town Hall</h3>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">Title</label>
                    <input
                      type="text"
                      value={townHallForm.title}
                      onChange={(e) => setTownHallForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="e.g. District Budget Q3 Town Hall"
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">
                      Date &amp; Time
                    </label>
                    <input
                      type="datetime-local"
                      value={townHallForm.scheduled_at}
                      onChange={(e) =>
                        setTownHallForm((f) => ({ ...f, scheduled_at: e.target.value }))
                      }
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">
                      Description{" "}
                      <span className="font-normal text-slate-400">(optional)</span>
                    </label>
                    <textarea
                      rows={3}
                      value={townHallForm.description}
                      onChange={(e) =>
                        setTownHallForm((f) => ({ ...f, description: e.target.value }))
                      }
                      placeholder="Agenda or topics to be discussed"
                      className="w-full resize-none rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400"
                    />
                  </div>

                  {townHallMessage && (
                    <p className="text-sm text-red-600">{townHallMessage}</p>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={submitTownHall}
                      disabled={townHallSubmitting}
                      className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
                    >
                      {townHallSubmitting ? "Scheduling..." : "Schedule"}
                    </button>
                    <button
                      onClick={() => setShowTownHallForm(false)}
                      className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {townHallMessage && !showTownHallForm && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
                {townHallMessage}
              </div>
            )}

            {townHalls.length > 0 ? (
              <div className="space-y-4">
                {townHalls.map((hall) => {
                  const isPast = new Date(hall.scheduled_at) < new Date();
                  return (
                    <article
                      key={hall.id}
                      className={`rounded-3xl border bg-white p-6 shadow-sm ${
                        isPast ? "border-slate-200 opacity-70" : "border-blue-200"
                      }`}
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${
                                isPast
                                  ? "bg-slate-100 text-slate-500"
                                  : "bg-blue-50 text-blue-700"
                              }`}
                            >
                              {isPast ? "Past" : "Upcoming"}
                            </span>
                            {hall.district && (
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                {hall.district}
                              </span>
                            )}
                          </div>
                          <h3 className="mt-3 text-xl font-bold text-slate-950">{hall.title}</h3>
                          <p className="mt-1 text-sm font-semibold text-slate-500">
                            <CalendarClock className="mr-1 inline h-4 w-4" />
                            {formatTownHallDate(hall.scheduled_at)}
                          </p>
                          {hall.description && (
                            <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                              {hall.description}
                            </p>
                          )}
                          <a
                            href={hall.meeting_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline"
                          >
                            <Video className="h-4 w-4" />
                            Join video room
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>

                        <div className="flex items-start gap-2">
                          <div className="flex items-center gap-1 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                            <Users className="h-4 w-4" />
                            Open to all citizens
                          </div>
                          <button
                            onClick={() => deleteTownHall(hall.id)}
                            className="rounded-2xl border border-red-200 p-2 text-red-500 transition hover:bg-red-50"
                            title="Delete town hall"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
                <CalendarClock className="mx-auto h-10 w-10 text-slate-400" />
                <p className="mt-4 text-xl font-bold text-slate-950">No town halls scheduled</p>
                <p className="mt-2 text-slate-500">
                  Click &quot;Schedule Town Hall&quot; to add one to the calendar.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "amber" | "blue" | "green" | "red";
}) {
  const classes = {
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className={`mt-3 w-fit rounded-2xl px-3 py-1 text-3xl font-extrabold ${classes[tone]}`}>
        {value}
      </p>
    </div>
  );
}

function InfoBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-700">{text}</p>
    </div>
  );
}
