"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Sidebar from "@/components/layout/Sidebar";
import {
  Megaphone,
  Users,
  Sparkles,
  Send,
  Loader2,
  Check,
  X,
  RefreshCw,
  Download,
} from "lucide-react";

type CampaignRow = {
  id: string;
  name: string;
  goal: string | null;
  from_name: string;
  from_email: string;
  daily_cap: number;
  status: string;
  audience_filter: { states?: string[]; office_types?: string[]; levels?: string[] };
  counts: Record<string, number>;
};

type LeadSummary = { total: number; states: string[]; officeTypes: string[] };

type MessageRow = {
  id: string;
  to_email: string;
  subject: string | null;
  body: string | null;
  status: string;
  error: string | null;
  lead?: { org_name: string | null; contact_name: string | null; state: string | null } | null;
};

const STATUS_TONE: Record<string, string> = {
  drafted: "bg-slate-100 text-slate-700",
  approved: "bg-blue-100 text-blue-700",
  sent: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  bounced: "bg-red-100 text-red-700",
  skipped: "bg-amber-100 text-amber-700",
  replied: "bg-purple-100 text-purple-700",
};

export default function OutreachPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [leads, setLeads] = useState<LeadSummary>({ total: 0, states: [], officeTypes: [] });

  const [selected, setSelected] = useState<CampaignRow | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);

  const [form, setForm] = useState({
    name: "",
    goal: "",
    from_name: "Civix250 Team",
    from_email: "outreach@civix250.ai",
    reply_to: "",
    postal_address: "Civix250, 123 Main St, Austin, TX 78701",
    daily_cap: 25,
    states: [] as string[],
    office_types: [] as string[],
    ai_prompt: "",
  });

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = useCallback(async () => {
    const [c, l] = await Promise.all([
      fetch("/api/outreach/campaigns").then((r) => r.json()),
      fetch("/api/outreach/leads?limit=1").then((r) => r.json()),
    ]);
    if (c.campaigns) setCampaigns(c.campaigns);
    if (l.total !== undefined)
      setLeads({ total: l.total, states: l.states || [], officeTypes: l.officeTypes || [] });
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (!profile || profile.role !== "admin") {
        router.push("/dashboard");
        return;
      }
      if (!mounted) return;
      await loadData();
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [router, supabase, loadData]);

  async function importLeads() {
    setBusy("import");
    try {
      const res = await fetch("/api/outreach/import-leads", { method: "POST" }).then((r) => r.json());
      if (res.error) flash(res.error);
      else flash(`Imported ${res.imported} leads (${res.skippedNoEmail} had no email).`);
      await loadData();
    } finally {
      setBusy(null);
    }
  }

  async function createCampaign() {
    if (!form.name.trim()) return flash("Campaign name is required.");
    setBusy("create");
    try {
      const res = await fetch("/api/outreach/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          goal: form.goal,
          from_name: form.from_name,
          from_email: form.from_email,
          reply_to: form.reply_to,
          postal_address: form.postal_address,
          daily_cap: form.daily_cap,
          ai_prompt: form.ai_prompt,
          audience_filter: {
            states: form.states,
            office_types: form.office_types,
          },
        }),
      }).then((r) => r.json());
      if (res.error) flash(res.error);
      else {
        flash("Campaign created.");
        setForm((f) => ({ ...f, name: "", goal: "", ai_prompt: "" }));
        await loadData();
      }
    } finally {
      setBusy(null);
    }
  }

  async function draft(c: CampaignRow) {
    setBusy(`draft-${c.id}`);
    try {
      const res = await fetch("/api/outreach/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: c.id, limit: 8 }),
      }).then((r) => r.json());
      if (res.error) flash(res.error);
      else flash(`Drafted ${res.drafted} emails. ${res.remaining} audience leads remaining.`);
      await loadData();
      if (selected?.id === c.id) await openReview(c);
    } finally {
      setBusy(null);
    }
  }

  async function openReview(c: CampaignRow) {
    setSelected(c);
    const res = await fetch(`/api/outreach/messages?campaign_id=${c.id}`).then((r) => r.json());
    setMessages(res.messages || []);
  }

  async function patchMessage(id: string, payload: Record<string, unknown>) {
    const res = await fetch("/api/outreach/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...payload }),
    }).then((r) => r.json());
    if (res.message) setMessages((prev) => prev.map((m) => (m.id === id ? res.message : m)));
  }

  async function send(c: CampaignRow) {
    setBusy(`send-${c.id}`);
    try {
      const res = await fetch("/api/outreach/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: c.id }),
      }).then((r) => r.json());
      if (res.error) flash(res.error);
      else flash(`Sent ${res.sent}, failed ${res.failed}, suppressed ${res.suppressed}.`);
      await loadData();
      if (selected?.id === c.id) await openReview(c);
    } finally {
      setBusy(null);
    }
  }

  function toggle(list: string[], v: string): string[] {
    return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto flex max-w-[1700px]">
          <Sidebar />
          <main className="flex flex-1 items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-[1700px]">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8">
          <div className="mb-6 flex items-center gap-3">
            <Megaphone className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Outreach Agent</h1>
              <p className="text-sm text-slate-600">
                AI-drafted campaigns to government offices — with approval, suppression, and CAN-SPAM footers.
              </p>
            </div>
          </div>

          {toast && (
            <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              {toast}
            </div>
          )}

          {/* Leads */}
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-slate-500" />
                <div>
                  <p className="text-sm text-slate-500">Leads</p>
                  <p className="text-2xl font-bold text-slate-900">{leads.total}</p>
                </div>
              </div>
              <button
                onClick={importLeads}
                disabled={busy === "import"}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {busy === "import" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Import from officials DB
              </button>
            </div>
            {leads.states.length > 0 && (
              <p className="mt-3 text-xs text-slate-500">
                States: {leads.states.join(", ")} · Office types: {leads.officeTypes.join(", ")}
              </p>
            )}
          </section>

          {/* Create campaign */}
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">New Campaign</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input className="input" placeholder="Campaign name" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input className="input" placeholder="Daily send cap" type="number" value={form.daily_cap}
                onChange={(e) => setForm({ ...form, daily_cap: Number(e.target.value) })} />
              <input className="input md:col-span-2" placeholder="Goal (what should this campaign achieve?)"
                value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} />
              <input className="input" placeholder="From name" value={form.from_name}
                onChange={(e) => setForm({ ...form, from_name: e.target.value })} />
              <input className="input" placeholder="From email" value={form.from_email}
                onChange={(e) => setForm({ ...form, from_email: e.target.value })} />
              <input className="input md:col-span-2" placeholder="Postal address (required for CAN-SPAM)"
                value={form.postal_address} onChange={(e) => setForm({ ...form, postal_address: e.target.value })} />
              <textarea className="input md:col-span-2" rows={3}
                placeholder="Talking points / extra guidance for the AI (optional)"
                value={form.ai_prompt} onChange={(e) => setForm({ ...form, ai_prompt: e.target.value })} />
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Audience — states</p>
              <div className="flex flex-wrap gap-2">
                {leads.states.map((s) => (
                  <button key={s} onClick={() => setForm({ ...form, states: toggle(form.states, s) })}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${form.states.includes(s) ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"}`}>
                    {s}
                  </button>
                ))}
              </div>
              <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Audience — office types</p>
              <div className="flex flex-wrap gap-2">
                {leads.officeTypes.map((o) => (
                  <button key={o} onClick={() => setForm({ ...form, office_types: toggle(form.office_types, o) })}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${form.office_types.includes(o) ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"}`}>
                    {o}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={createCampaign} disabled={busy === "create"}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              {busy === "create" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Create campaign
            </button>
          </section>

          {/* Campaigns */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Campaigns</h2>
            {campaigns.length === 0 && (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
                No campaigns yet. Import leads and create one above.
              </p>
            )}
            {campaigns.map((c) => (
              <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{c.name}</p>
                    <p className="text-sm text-slate-500">{c.goal}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      From {c.from_name} &lt;{c.from_email}&gt; · cap {c.daily_cap}/day ·
                      {" "}
                      {(c.audience_filter.states || []).join(", ") || "all states"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {Object.entries(c.counts).map(([s, n]) => (
                        <span key={s} className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[s] || "bg-slate-100 text-slate-600"}`}>
                          {n} {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => draft(c)} disabled={busy === `draft-${c.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                      {busy === `draft-${c.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                      Draft (AI)
                    </button>
                    <button onClick={() => openReview(c)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                      <RefreshCw className="h-3.5 w-3.5" /> Review
                    </button>
                    <button onClick={() => send(c)} disabled={busy === `send-${c.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                      {busy === `send-${c.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      Send approved
                    </button>
                  </div>
                </div>

                {selected?.id === c.id && (
                  <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                    {messages.length === 0 && (
                      <p className="text-sm text-slate-500">No drafts yet — click “Draft (AI)”.</p>
                    )}
                    {messages.map((m) => (
                      <div key={m.id} className="rounded-xl border border-slate-200 p-4">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-slate-800">
                            {m.lead?.contact_name || m.to_email}
                            <span className="ml-2 text-xs text-slate-400">{m.to_email}</span>
                          </p>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[m.status] || "bg-slate-100 text-slate-600"}`}>
                            {m.status}
                          </span>
                        </div>
                        <input className="input mb-2 text-sm" value={m.subject || ""}
                          onChange={(e) => setMessages((prev) => prev.map((x) => x.id === m.id ? { ...x, subject: e.target.value } : x))} />
                        <textarea className="input text-sm" rows={5} value={m.body || ""}
                          onChange={(e) => setMessages((prev) => prev.map((x) => x.id === m.id ? { ...x, body: e.target.value } : x))} />
                        {m.error && <p className="mt-1 text-xs text-red-600">{m.error}</p>}
                        {(m.status === "drafted" || m.status === "approved") && (
                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={() => patchMessage(m.id, { action: "approve", subject: m.subject, body: m.body })}
                              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
                              <Check className="h-3.5 w-3.5" /> Approve
                            </button>
                            <button onClick={() => patchMessage(m.id, { action: "skip" })}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                              <X className="h-3.5 w-3.5" /> Skip
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </section>
        </main>
      </div>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          border: 1px solid #e2e8f0;
          border-radius: 0.75rem;
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          color: #0f172a;
          background: #fff;
        }
        :global(.input:focus) {
          outline: 2px solid #bfdbfe;
          border-color: #93c5fd;
        }
      `}</style>
    </div>
  );
}
