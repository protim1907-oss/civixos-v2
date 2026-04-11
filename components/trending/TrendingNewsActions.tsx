"use client";

import { useMemo, useState } from "react";
import { MessageCircle, Share2, ThumbsUp } from "lucide-react";

type Props = {
  title: string;
  link: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function TrendingNewsActions({ title, link }: Props) {
  const [upvoted, setUpvoted] = useState(false);
  const [upvotes, setUpvotes] = useState(12);
  const [copied, setCopied] = useState(false);

  const commentHref = useMemo(() => {
    return `/district-feed?comment=${encodeURIComponent(slugify(title))}`;
  }, [title]);

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

  return (
    <div className="mt-5 flex flex-wrap items-center gap-3">
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

      <a
        href={commentHref}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        <MessageCircle className="h-4 w-4" />
        Comment
      </a>

      <button
        type="button"
        onClick={handleShare}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        <Share2 className="h-4 w-4" />
        {copied ? "Link copied" : "Share"}
      </button>
    </div>
  );
}