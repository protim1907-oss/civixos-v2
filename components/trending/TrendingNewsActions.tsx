"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageCircle, ThumbsUp, Share2, Send, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type ProfileRow = {
  full_name: string | null;
  email: string | null;
};

type CommentRow = {
  id: string;
  comment_text: string;
  created_at: string;
  user_id: string;
  profiles: ProfileRow[] | null;
};

type Props = {
  storyId: string;
  title: string;
  link: string;
  source: string;
};

export default function TrendingNewsActions({
  storyId,
  title,
  link,
  source,
}: Props) {
  const supabase = useMemo(() => createClient(), []);

  const [userId, setUserId] = useState<string | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [upvoteCount, setUpvoteCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [shareCount, setShareCount] = useState(0);
  const [hasUpvoted, setHasUpvoted] = useState(false);

  const [comments, setComments] = useState<CommentRow[]>([]);
  const [commentText, setCommentText] = useState("");
  const [savingComment, setSavingComment] = useState(false);
  const [togglingVote, setTogglingVote] = useState(false);
  const [sharing, setSharing] = useState(false);

  async function loadCurrentUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error("Error loading current user:", error);
      setUserId(null);
      return null;
    }

    const currentUserId = user?.id ?? null;
    setUserId(currentUserId);
    return currentUserId;
  }

  async function loadCounts(currentUserId?: string | null) {
    try {
      const [{ count: upvotes }, { count: commentsTotal }, { count: sharesTotal }] =
        await Promise.all([
          supabase
            .from("news_interactions")
            .select("*", { count: "exact", head: true })
            .eq("story_id", storyId)
            .eq("interaction_type", "upvote"),
          supabase
            .from("news_comments")
            .select("*", { count: "exact", head: true })
            .eq("story_id", storyId),
          supabase
            .from("news_interactions")
            .select("*", { count: "exact", head: true })
            .eq("story_id", storyId)
            .eq("interaction_type", "share"),
        ]);

      setUpvoteCount(upvotes ?? 0);
      setCommentCount(commentsTotal ?? 0);
      setShareCount(sharesTotal ?? 0);

      const effectiveUserId = currentUserId ?? userId;

      if (effectiveUserId) {
        const { data: existingVote, error } = await supabase
          .from("news_interactions")
          .select("id")
          .eq("story_id", storyId)
          .eq("interaction_type", "upvote")
          .eq("user_id", effectiveUserId)
          .maybeSingle();

        if (error) {
          console.error("Error checking existing vote:", error);
          setHasUpvoted(false);
        } else {
          setHasUpvoted(!!existingVote);
        }
      } else {
        setHasUpvoted(false);
      }
    } catch (error) {
      console.error("Error loading counts:", error);
    }
  }

  async function loadComments() {
    try {
      const { data, error } = await supabase
        .from("news_comments")
        .select(`
          id,
          comment_text,
          created_at,
          user_id,
          profiles (
            full_name,
            email
          )
        `)
        .eq("story_id", storyId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading comments:", error);
        return;
      }

      const rows: CommentRow[] = (data ?? []).map((item: any) => ({
        id: item.id,
        comment_text: item.comment_text,
        created_at: item.created_at,
        user_id: item.user_id,
        profiles: Array.isArray(item.profiles) ? item.profiles : item.profiles ? [item.profiles] : [],
      }));

      setComments(rows);
    } catch (error) {
      console.error("Unexpected error loading comments:", error);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        setLoading(true);
        const currentUserId = await loadCurrentUser();
        await Promise.all([loadCounts(currentUserId), loadComments()]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();

    const interactionChannel = supabase
      .channel(`story-interactions-${storyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "news_interactions",
          filter: `story_id=eq.${storyId}`,
        },
        async () => {
          await loadCounts();
        }
      )
      .subscribe();

    const commentChannel = supabase
      .channel(`story-comments-${storyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "news_comments",
          filter: `story_id=eq.${storyId}`,
        },
        async () => {
          await Promise.all([loadCounts(), loadComments()]);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(interactionChannel);
      supabase.removeChannel(commentChannel);
    };
  }, [storyId, supabase]);

  async function handleToggleUpvote() {
    if (!userId) {
      alert("Please sign in to upvote.");
      return;
    }

    try {
      setTogglingVote(true);

      if (hasUpvoted) {
        const { error } = await supabase
          .from("news_interactions")
          .delete()
          .eq("story_id", storyId)
          .eq("interaction_type", "upvote")
          .eq("user_id", userId);

        if (error) {
          console.error("Error removing upvote:", error);
          return;
        }

        setHasUpvoted(false);
        setUpvoteCount((prev) => Math.max(0, prev - 1));
      } else {
        const { error } = await supabase.from("news_interactions").insert({
          story_id: storyId,
          story_title: title,
          story_link: link,
          interaction_type: "upvote",
          user_id: userId,
          metadata: { source },
        });

        if (error) {
          console.error("Error adding upvote:", error);
          return;
        }

        setHasUpvoted(true);
        setUpvoteCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Unexpected upvote error:", error);
    } finally {
      setTogglingVote(false);
    }
  }

  async function handleAddComment() {
    if (!userId) {
      alert("Please sign in to comment.");
      return;
    }

    const text = commentText.trim();
    if (!text) return;

    try {
      setSavingComment(true);

      const { error } = await supabase.from("news_comments").insert({
        story_id: storyId,
        story_title: title,
        story_link: link,
        comment_text: text,
        user_id: userId,
      });

      if (error) {
        console.error("Error adding comment:", error);
        return;
      }

      setCommentText("");
      setCommentsOpen(true);
      await Promise.all([loadComments(), loadCounts()]);
    } catch (error) {
      console.error("Unexpected comment error:", error);
    } finally {
      setSavingComment(false);
    }
  }

  async function handleShare() {
    try {
      setSharing(true);

      if (navigator.share) {
        await navigator.share({
          title,
          text: `Interesting civic story from ${source}`,
          url: link,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(link);
        alert("Story link copied.");
      }

      if (userId) {
        const { error } = await supabase.from("news_interactions").insert({
          story_id: storyId,
          story_title: title,
          story_link: link,
          interaction_type: "share",
          user_id: userId,
          metadata: { source },
        });

        if (error) {
          console.error("Error saving share interaction:", error);
        }
      }
    } catch (error) {
      console.error("Share error:", error);

      try {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(link);
          alert("Story link copied.");
        }
      } catch (clipboardError) {
        console.error("Clipboard fallback failed:", clipboardError);
      }
    } finally {
      setSharing(false);
      await loadCounts();
    }
  }

  function formatCommentDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  return (
    <div>
      <div className="flex items-center gap-5 text-sm text-slate-600">
        <button
          type="button"
          onClick={() => setCommentsOpen((prev) => !prev)}
          className="inline-flex items-center gap-2 transition hover:text-blue-700"
          aria-label="Comment"
          title="Comment"
        >
          <MessageCircle className="h-5 w-5" />
          <span>{commentCount}</span>
        </button>

        <button
          type="button"
          onClick={handleToggleUpvote}
          disabled={togglingVote || loading}
          className={`inline-flex items-center gap-2 transition ${
            hasUpvoted ? "text-blue-700" : "text-slate-600 hover:text-blue-700"
          } ${togglingVote || loading ? "opacity-60" : ""}`}
          aria-label="Upvote"
          title="Upvote"
        >
          {togglingVote ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ThumbsUp className={`h-5 w-5 ${hasUpvoted ? "fill-current" : ""}`} />
          )}
          <span>{upvoteCount}</span>
        </button>

        <button
          type="button"
          onClick={handleShare}
          disabled={sharing || loading}
          className={`inline-flex items-center gap-2 transition hover:text-blue-700 ${
            sharing || loading ? "opacity-60" : ""
          }`}
          aria-label="Share"
          title="Share"
        >
          {sharing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Share2 className="h-5 w-5" />}
          <span>{shareCount}</span>
        </button>
      </div>

      {commentsOpen && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment..."
              className="h-11 flex-1 rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none ring-0 placeholder:text-slate-400 focus:border-blue-500"
            />
            <button
              type="button"
              onClick={handleAddComment}
              disabled={savingComment || !commentText.trim()}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              title="Post comment"
            >
              {savingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {comments.length === 0 ? (
              <p className="text-sm text-slate-500">No comments yet.</p>
            ) : (
              comments.map((comment) => {
                const profile = Array.isArray(comment.profiles)
                  ? comment.profiles[0]
                  : null;

                return (
                  <div
                    key={comment.id}
                    className="rounded-xl border border-slate-200 bg-white p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">
                        {profile?.full_name || profile?.email || "Citizen"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatCommentDate(comment.created_at)}
                      </p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {comment.comment_text}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}