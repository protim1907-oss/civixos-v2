"use client";

import { createClient } from "./client";

// In-app chat notifications: a single app-wide Realtime subscription to new
// messages addressed to the current user, driving a toast + a Sidebar unread
// badge. "Unread" persists across reloads via a localStorage "last seen"
// timestamp — on startup we count messages that arrived since then, so unread
// survives closing/reopening the app without any schema change.

export type ChatToast = { id: string; senderName: string; message: string };

type MessageRow = {
  id: string;
  sender_id: string | null;
  sender_name: string | null;
  receiver_name: string | null;
  message: string | null;
  created_at: string | null;
};

let initPromise: Promise<void> | null = null;
let userId: string | null = null;
let myName: string | null = null;
let unreadCount = 0;

const unreadListeners = new Set<(count: number) => void>();
const toastListeners = new Set<(toast: ChatToast) => void>();

function lastSeenKey() {
  return `civix_chat_last_seen_${userId}`;
}
function getLastSeen(): string {
  if (typeof localStorage === "undefined") return "1970-01-01T00:00:00Z";
  return localStorage.getItem(lastSeenKey()) || "1970-01-01T00:00:00Z";
}
function setLastSeen(ts: string) {
  if (typeof localStorage !== "undefined" && userId) {
    localStorage.setItem(lastSeenKey(), ts);
  }
}

function emitUnread() {
  unreadListeners.forEach((l) => l(unreadCount));
}

async function init() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    initPromise = null; // not logged in yet — allow retry
    return;
  }
  userId = user.id;
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  myName = (profile?.full_name || "").trim();
  if (!myName) {
    initPromise = null;
    return;
  }

  // Persistent unread: messages addressed to me, from someone else, since last seen.
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("receiver_name", myName)
    .neq("sender_id", user.id)
    .gt("created_at", getLastSeen());
  unreadCount = count || 0;
  emitUnread();

  // RLS-gated postgres_changes need the realtime socket authenticated so the
  // recipient policy (which depends on auth.uid()) evaluates — otherwise the
  // INSERT events are silently dropped.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    supabase.realtime.setAuth(session.access_token);
  }

  // Realtime: new incoming messages (RLS lets recipients read their own rows).
  // The client retains the channel, so no local reference is needed.
  supabase
    .channel("chat-inbox")
    .on(
      "postgres_changes",
      // No server-side filter on receiver_name: names contain spaces, which
      // realtime's filter grammar mishandles. RLS already limits delivered
      // rows to those addressed to me, and we double-check client-side.
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
      },
      (payload) => {
        const m = payload.new as MessageRow;
        if (!m || m.sender_id === userId) return; // ignore my own messages
        if ((m.receiver_name || "").trim() !== myName) return; // not for me
        unreadCount += 1;
        emitUnread();
        const toast: ChatToast = {
          id: String(m.id),
          senderName: (m.sender_name || "Someone").trim(),
          message: (m.message || "").trim(),
        };
        toastListeners.forEach((l) => l(toast));
      }
    )
    .subscribe();
}

// Start the inbox subscription. Safe to call from many components — runs once.
export function startChatNotifications() {
  if (!initPromise) initPromise = init();
  return initPromise;
}

// Badge count subscription. Fires immediately with the current count.
export function subscribeUnread(cb: (count: number) => void) {
  unreadListeners.add(cb);
  cb(unreadCount);
  return () => {
    unreadListeners.delete(cb);
  };
}

// Toast subscription — fires each time a new message arrives.
export function subscribeChatToast(cb: (toast: ChatToast) => void) {
  toastListeners.add(cb);
  return () => {
    toastListeners.delete(cb);
  };
}

// Mark everything read (call when the user opens the chat area).
export function markChatRead() {
  setLastSeen(new Date().toISOString());
  unreadCount = 0;
  emitUnread();
}
