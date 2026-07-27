"use client";

import { createClient } from "./client";

// A single shared Realtime Presence channel for the whole app. createBrowserClient
// is a singleton, so two channels with the same topic on it collide — we must
// create the "online-citizens" channel exactly once and both track + read on it.

type PresenceMeta = { name?: string; district?: string };

let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;
let starting = false;
const listeners = new Set<(onlineKeys: Set<string>) => void>();

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

// Ensures the current user is tracked as online. Safe to call from many
// components — it only starts the channel once per session.
export async function startPresence() {
  if (channel || starting) return;
  starting = true;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    starting = false;
    return;
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, district")
    .eq("id", user.id)
    .maybeSingle();

  channel = supabase.channel("online-citizens", {
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
  starting = false;
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
