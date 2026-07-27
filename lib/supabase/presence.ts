"use client";

import { createClient as createRealtimeClient } from "@supabase/supabase-js";
import { createClient } from "./client";

// A single shared Realtime Presence channel for the whole app, used to show who
// is online in the Community Chat directory.
//
// Two important details:
//  1. Presence is tracked on a *dedicated anon* Realtime client. An authenticated
//     realtime connection has its presence writes dropped (channel authorization),
//     whereas an anon public-channel presence works. Presence only carries the
//     name + district (already public via the directory), so anon is fine.
//  2. Multiple components call startPresence(); a single memoized init promise
//     guarantees exactly ONE channel — two channels with the same topic on one
//     client collide and silently break presence.

type PresenceMeta = { name?: string; district?: string };

let realtimeClient: ReturnType<typeof createRealtimeClient> | null = null;
let channel: ReturnType<ReturnType<typeof createRealtimeClient>["channel"]> | null = null;
let initPromise: Promise<void> | null = null;
const listeners = new Set<(onlineKeys: Set<string>) => void>();

function getRealtimeClient() {
  if (!realtimeClient) {
    realtimeClient = createRealtimeClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }
  return realtimeClient;
}

export function presenceKey(name: string, district: string) {
  return `${(name || "").trim().toLowerCase()}|${(district || "").trim().toLowerCase()}`;
}

function computeOnlineKeys(): Set<string> {
  const keys = new Set<string>();
  if (!channel) return keys;
  const state = channel.presenceState() as Record<string, PresenceMeta[]>;
  for (const metas of Object.values(state)) {
    for (const meta of metas) {
      if (meta?.name) keys.add(presenceKey(meta.name, meta.district || ""));
    }
  }
  return keys;
}

function emit() {
  const keys = computeOnlineKeys();
  listeners.forEach((l) => l(keys));
}

async function init() {
  // Identify the current user via the authenticated app client…
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    initPromise = null; // not logged in yet — allow a later retry
    return;
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, district")
    .eq("id", user.id)
    .maybeSingle();

  // …but track/read presence on a dedicated anon Realtime client, using ONE
  // channel for the whole app.
  channel = getRealtimeClient().channel("online-citizens", {
    config: { presence: { key: user.id } },
  });
  channel
    .on("presence", { event: "sync" }, emit)
    .on("presence", { event: "join" }, emit)
    .on("presence", { event: "leave" }, emit)
    .subscribe((status) => {
      if (status === "SUBSCRIBED" && channel) {
        channel.track({
          name: (profile?.full_name || "").trim(),
          district: (profile?.district || "").trim(),
          online_at: new Date().toISOString(),
        });
      }
    });
}

// Ensures the current user is tracked as online. Safe to call from any number of
// components — the underlying init runs exactly once.
export function startPresence() {
  if (!initPromise) initPromise = init();
  return initPromise;
}

// Subscribe to online-state changes. Fires immediately with the current set,
// then on every presence change. Returns an unsubscribe function.
export function subscribePresence(cb: (onlineKeys: Set<string>) => void) {
  listeners.add(cb);
  cb(computeOnlineKeys());
  return () => {
    listeners.delete(cb);
  };
}
