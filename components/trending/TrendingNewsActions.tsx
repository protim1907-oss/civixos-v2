"use client";

import { useState } from "react";
import { MessageCircle, Share2, ThumbsUp, Send } from "lucide-react";

type Props = {
  title: string;
  link: string;
};

type CommentItem = {
  id: number;
  author: string;
  text: string;
  createdAt: string;
};

export default function TrendingNewsActions({ title, link }: Props) {
  const [upvoted, setUpvoted] = useState(false);
  const [upvotes, setUpvotes] = useState(12);
  const [copied, setCopied] = useState(false);

  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<CommentItem[]>([]);

  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({
          title,
          url: link,
        });
      } else {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      // user cancelled share or clipboard failed
    }
  }

  function handleUpvote() {
    setUpvoted((prev) => {
      const next = !prev;
      setUpvotes((count) => (next ? count + 1 : count - 1));
      return next;
    });
  }

  function handleSubmitComment() {
    const trimmed = commentText.trim();
    if (!trimmed) return;

    const newComment: CommentItem = {
      id: Date.now(),
      author: "You",
      text: trimmed,
      createdAt: "Just now",
    };

    setComments((prev) => [newComment, ...prev]);
    setCommentText("");
    setShowComments(true);
  }

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleUpvote}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
            upvoted
              ? "border-blue-200 bg-blue-50 text-blue-700"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          <ThumbsUp className="h-4 w-4" />
          Upvote
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
            {upvotes}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setShowComments((prev) => !prev)}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
            showComments
              ? "border-indigo-200 bg-indigo-50 text-indigo-700"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          <MessageCircle className="h-4 w-4" />
          Comment
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
            {comments.length}
          </span>
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <Share2 className="h-4 w-4" />
          {copied ? "Link copied" : "Share"}
        </button>
      </div>

      {showComments && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">
            Comment on this story
          </p>
          <p className="mt-1 text-xs text-slate-500">{title}</p>

          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSubmitComment();
                }
              }}
              placeholder="Write your comment..."
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400"
            />

            <button
              type="button"
              onClick={handleSubmitComment}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <Send className="h-4 w-4" />
              Post
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {comments.length === 0 ? (
              <div className="rounded-xl bg-white px-4 py-3 text-sm text-slate-500">
                No comments yet. Start the discussion.
              </div>
            ) : (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-900">
                      {comment.author}
                    </span>
                    <span className="text-xs text-slate-500">
                      {comment.createdAt}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {comment.text}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}