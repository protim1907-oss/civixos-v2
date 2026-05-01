"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import { createClient } from "@/lib/supabase/client";

type FeedPost = {
  id: string;
  kind: "issue" | "post";
  title: string;
  description: string;
  district: string;
  category: string;
  urgency: "High" | "Medium" | "Low";
  status: "Open" | "Under Review" | "Resolved" | "Escalated" | "Active" | "Removed";
  upvotes: number;
  comments: number;
  representative: string;
  hasUpvoted: boolean;
};

type IssueRow = {
  id: string;
  title: string | null;
  description: string | null;
  user_id: string | null;
  district: string | null;
  category?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type DiscussionRow = {
  id: string;
  title: string;
  topic: string | null;
  district: string | null;
  status: string;
};

type PostRow = {
  id: string;
  discussion_id: string;
  parent_post_id: string | null;
  author_id: string | null;
  content: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type VoteRow = {
  issue_id: string | null;
  user_id?: string | null;
};

type CommentRow = {
  id?: string;
  issue_id: string | null;
  user_id?: string | null;
  content?: string | null;
  created_at?: string | null;
};

type ProfileRow = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  district?: string | null;
  state?: string | null;
};

type RepresentativeRow = {
  id?: string;
  name?: string | null;
  representative_name?: string | null;
  full_name?: string | null;
  district?: string | null;
  district_id?: string | null;
  office?: string | null;
  office_title?: string | null;
};

type CommentMap = Record<string, CommentRow[]>;
type ProfileNameMap = Record<string, string>;

type ChatMessage = {
  id: string;
  sender: "user" | "rep";
  text: string;
  time: string;
};

type MeetingForm = {
  topic: string;
  preferredTimes: string;
  notes: string;
};

function displayDistrictName(value?: string | null) {
  const normalized = (value || "").trim().toUpperCase();

  switch (normalized) {
    case "NH":
      return "New Hampshire";
    case "NH-01":
      return "New Hampshire 1st Congressional District";
    case "NH-02":
      return "New Hampshire 2nd Congressional District";
    case "TX":
      return "Texas";
    case "TX-12":
      return "Texas 12th District";
    case "TX-20":
      return "Texas 20th District";
    case "TX-35":
      return "Texas 35th District";
    case "CA":
      return "California";
    case "FL":
      return "Florida";
    default:
      return value || "Your District";
  }
}

function getStatusStyles(status: FeedPost["status"]) {
  switch (status) {
    case "Open":
      return "border-l-4 border-red-500";
    case "Under Review":
      return "border-l-4 border-amber-500";
    case "Resolved":
      return "border-l-4 border-emerald-500";
    case "Escalated":
      return "border-l-4 border-blue-500";
    case "Active":
      return "border-l-4 border-violet-500";
    case "Removed":
      return "border-l-4 border-slate-500";
    default:
      return "border-l-4 border-slate-300";
  }
}

function getUrgencyBadge(urgency: FeedPost["urgency"]) {
  switch (urgency) {
    case "High":
      return "bg-red-100 text-red-700";
    case "Medium":
      return "bg-amber-100 text-amber-700";
    case "Low":
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getStatusBadge(status: FeedPost["status"]) {
  switch (status) {
    case "Open":
      return "bg-red-100 text-red-700";
    case "Under Review":
      return "bg-amber-100 text-amber-700";
    case "Resolved":
      return "bg-emerald-100 text-emerald-700";
    case "Escalated":
      return "bg-blue-100 text-blue-700";
    case "Active":
      return "bg-violet-100 text-violet-700";
    case "Removed":
      return "bg-slate-200 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function inferUrgency(title: string, description: string): FeedPost["urgency"] {
  const text = `${title} ${description}`.toLowerCase();

  if (
    text.includes("flood") ||
    text.includes("waterlogging") ||
    text.includes("danger") ||
    text.includes("unsafe") ||
    text.includes("pothole") ||
    text.includes("overflow") ||
    text.includes("manhole") ||
    text.includes("hate") ||
    text.includes("kill")
  ) {
    return "High";
  }

  if (
    text.includes("streetlight") ||
    text.includes("garbage") ||
    text.includes("drain") ||
    text.includes("traffic") ||
    text.includes("bus")
  ) {
    return "Medium";
  }

  return "Low";
}

function inferCategory(title: string, description: string) {
  const text = `${title} ${description}`.toLowerCase();

  if (
    text.includes("road") ||
    text.includes("pothole") ||
    text.includes("drain") ||
    text.includes("waterlogging") ||
    text.includes("pipeline") ||
    text.includes("manhole")
  ) {
    return "Infrastructure";
  }

  if (
    text.includes("school") ||
    text.includes("crime") ||
    text.includes("police") ||
    text.includes("safety") ||
    text.includes("hate")
  ) {
    return "Public Safety";
  }

  if (text.includes("bus") || text.includes("traffic") || text.includes("crossing")) {
    return "Transportation";
  }

  if (text.includes("garbage") || text.includes("trash") || text.includes("waste")) {
    return "Sanitation";
  }

  return "General";
}

function normalizeIssueStatus(value?: string | null): FeedPost["status"] {
  const v = (value || "").toLowerCase().trim();
  if (v === "under review" || v === "under_review") return "Under Review";
  if (v === "resolved") return "Resolved";
  if (v === "escalated") return "Escalated";
  if (v === "removed") return "Removed";
  if (v === "active") return "Active";
  if (v === "approved") return "Active";
  return "Open";
}

function normalizePostStatus(value?: string | null): FeedPost["status"] {
  const v = (value || "").toLowerCase().trim();
  if (v === "removed") return "Removed";
  return "Active";
}

function normalizeDistrict(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function isStaffRole(role?: string | null) {
  return role === "admin" || role === "moderator" || role === "official";
}

function getProfileDisplayName(profile?: ProfileRow | null) {
  if (!profile) return "Citizen";
  if (profile.full_name?.trim()) return profile.full_name.trim();
  if (profile.name?.trim()) return profile.name.trim();
  if (profile.email?.trim()) return profile.email.split("@")[0];
  return "Citizen";
}

export default function FeedPage() {
  const supabase = useMemo(() => createClient(), []);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [urgencyFilter, setUrgencyFilter] = useState("All");

  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [currentDistrict, setCurrentDistrict] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("All");
  const [canViewAllDistricts, setCanViewAllDistricts] = useState(false);
  const [currentRepresentative, setCurrentRepresentative] = useState("Representative");
  const [loading, setLoading] = useState(true);
  const [debugMessage, setDebugMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [commentsByIssue, setCommentsByIssue] = useState<CommentMap>({});
  const [commenterNames, setCommenterNames] = useState<ProfileNameMap>({});
  const [openCommentsFor, setOpenCommentsFor] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [sharingIssueId, setSharingIssueId] = useState<string | null>(null);
  const [submittingCommentFor, setSubmittingCommentFor] = useState<string | null>(null);
  const [togglingVoteFor, setTogglingVoteFor] = useState<string | null>(null);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatRepresentative, setChatRepresentative] = useState("Representative");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");

  const [meetingOpen, setMeetingOpen] = useState(false);
  const [meetingRepresentative, setMeetingRepresentative] = useState("Representative");
  const [meetingRepresentativeTitle, setMeetingRepresentativeTitle] =
    useState("District Representative");
  const [meetingForm, setMeetingForm] = useState<MeetingForm>({
    topic: "",
    preferredTimes: "",
    notes: "",
  });
  const [meetingSubmitting, setMeetingSubmitting] = useState(false);
  const [meetingMessage, setMeetingMessage] = useState("");

  useEffect(() => {
    async function loadFeed() {
      try {
        setLoading(true);
        setDebugMessage("");

        const {
          data: { session },
        } = await supabase.auth.getSession();

        const guestUser =
          typeof window !== "undefined" ? localStorage.getItem("guest_user") : null;

        let district = "";
        let signedInUserId: string | null = null;

        if (session?.user) {
          signedInUserId = session.user.id;

          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("id, full_name, name, email, district, state")
            .eq("id", session.user.id)
            .maybeSingle();

          if (profileError) {
            console.error("Feed profile load error:", profileError);
          }

          district =
            (profileData as ProfileRow | null)?.district ||
            session.user.user_metadata?.district ||
            session.user.user_metadata?.district_name ||
            session.user.user_metadata?.district_id ||
            "";
        } else if (guestUser) {
          try {
            const parsedGuest = JSON.parse(guestUser);
            district =
              parsedGuest?.district ||
              parsedGuest?.district_name ||
              parsedGuest?.district_id ||
              "";
          } catch (error) {
            console.error("Guest parse error:", error);
          }
        }

        setCurrentUserId(signedInUserId);
        setCurrentDistrict(district);

        if (!district) {
          setFeedPosts([]);
          setDebugMessage("No district is assigned to this account yet.");
          return;
        }

        const { data: repsData, error: repsError } = await supabase
          .from("representatives")
          .select("*")
          .eq("district", district)
          .limit(5);

        if (repsError) {
          console.error("Representative load error:", repsError);
        }

        const representativeRows = (repsData as RepresentativeRow[]) || [];
        const representativeName =
          representativeRows[0]?.name ||
          representativeRows[0]?.representative_name ||
          representativeRows[0]?.full_name ||
          "Representative";

        setCurrentRepresentative(representativeName);

        const [issuesRes, discussionsRes] = await Promise.all([
          supabase
            .from("issues")
            .select("id, title, description, user_id, district, category, status, created_at")
            .eq("district", district)
            .order("created_at", { ascending: false })
            .limit(100),
          supabase
            .from("discussions")
            .select("id, title, topic, district, status")
            .eq("district", district)
            .eq("status", "active"),
        ]);

        if (issuesRes.error) {
          console.error("Issues load error:", issuesRes.error);
        }
        if (discussionsRes.error) {
          console.error("Discussions load error:", discussionsRes.error);
        }

        const issues = ((issuesRes.data as IssueRow[]) || []).filter(
          (issue) => issue?.id && normalizeDistrict(issue.district) === normalizeDistrict(district)
        );

        const discussions = (discussionsRes.data as DiscussionRow[]) || [];
        const discussionMap = new Map(discussions.map((d) => [d.id, d]));

        let districtPosts: PostRow[] = [];
        if (discussions.length > 0) {
          const discussionIds = discussions.map((d) => d.id);

          const { data: postsData, error: postsError } = await supabase
            .from("posts")
            .select("id, discussion_id, parent_post_id, author_id, content, status, created_at, updated_at")
            .in("discussion_id", discussionIds)
            .eq("status", "active")
            .order("created_at", { ascending: false });

          if (postsError) {
            console.error("Posts load error:", postsError);
          } else {
            districtPosts = (postsData as PostRow[]) || [];
          }
        }

        const issueIds = issues.map((issue) => issue.id);

        const [
          { data: votesData, error: votesError },
          { data: commentsData, error: commentsError },
        ] = await Promise.all([
          issueIds.length
            ? supabase.from("issue_votes").select("issue_id, user_id").in("issue_id", issueIds)
            : Promise.resolve({ data: [], error: null }),
          issueIds.length
            ? supabase
                .from("issue_comments")
                .select("id, issue_id, user_id, content, created_at")
                .in("issue_id", issueIds)
                .order("created_at", { ascending: false })
            : Promise.resolve({ data: [], error: null }),
        ]);

        if (votesError) {
          console.error("Votes load error:", votesError);
        }

        if (commentsError) {
          console.error("Comments load error:", commentsError);
        }

        const voteCounts: Record<string, number> = {};
        const userVoteMap: Record<string, boolean> = {};

        ((votesData as VoteRow[]) || []).forEach((row) => {
          if (!row.issue_id) return;
          voteCounts[row.issue_id] = (voteCounts[row.issue_id] || 0) + 1;

          if (signedInUserId && row.user_id === signedInUserId) {
            userVoteMap[row.issue_id] = true;
          }
        });

        const groupedComments: CommentMap = {};
        ((commentsData as CommentRow[]) || []).forEach((row) => {
          if (!row.issue_id) return;
          if (!groupedComments[row.issue_id]) groupedComments[row.issue_id] = [];
          groupedComments[row.issue_id].push(row);
        });

        setCommentsByIssue(groupedComments);

        const commentUserIds = Array.from(
          new Set(
            ((commentsData as CommentRow[]) || [])
              .map((row) => row.user_id)
              .filter(Boolean) as string[]
          )
        );

        if (commentUserIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("id, full_name, name, email")
            .in("id", commentUserIds);

          if (profilesError) {
            console.error("Profiles load error:", profilesError);
          }

          const nameMap: ProfileNameMap = {};
          ((profilesData as ProfileRow[]) || []).forEach((profile) => {
            nameMap[profile.id] = getProfileDisplayName(profile);
          });
          setCommenterNames(nameMap);
        } else {
          setCommenterNames({});
        }

        const mappedIssues: FeedPost[] = issues.map((issue, index) => ({
          id: issue.id ?? String(index),
          kind: "issue",
          title: issue.title || "Untitled issue",
          description: issue.description || "No description provided.",
          district: issue.district || district,
          category: issue.category || inferCategory(issue.title || "", issue.description || ""),
          urgency: inferUrgency(issue.title || "", issue.description || ""),
          status: normalizeIssueStatus(issue.status),
          upvotes: voteCounts[issue.id] || 0,
          comments: groupedComments[issue.id]?.length || 0,
          representative: representativeName,
          hasUpvoted: !!userVoteMap[issue.id],
        }));

        const mappedDiscussionPosts: FeedPost[] = districtPosts.map((post) => {
          const discussion = discussionMap.get(post.discussion_id);
          const raw = post.content || "";
          const parts = raw.split("\n\n");
          const firstLine = parts[0]?.trim() || "";
          const body = parts.slice(1).join("\n\n").trim() || raw;

          return {
            id: post.id,
            kind: "post",
            title: discussion?.title || firstLine || "Discussion Post",
            description: body,
            district: discussion?.district || district,
            category: discussion?.topic || "Community Discussion",
            urgency: inferUrgency(discussion?.title || firstLine, body),
            status: normalizePostStatus(post.status),
            upvotes: 0,
            comments: 0,
            representative: representativeName,
            hasUpvoted: false,
          };
        });

        const merged = [...mappedIssues, ...mappedDiscussionPosts];

        if (merged.length === 0) {
          setDebugMessage(`No issues or posts found for ${displayDistrictName(district)}.`);
        }

        setFeedPosts(merged);
      } catch (error) {
        console.error("Feed load error:", error);
        setFeedPosts([]);
        setDebugMessage("Something went wrong while loading the feed.");
      } finally {
        setLoading(false);
      }
    }

    loadFeed();
  }, [supabase]);

  const filteredPosts = useMemo(() => {
    return feedPosts.filter((post) => {
      const q = search.toLowerCase().trim();

      const matchesSearch =
        !q ||
        post.title.toLowerCase().includes(q) ||
        post.description.toLowerCase().includes(q) ||
        displayDistrictName(post.district).toLowerCase().includes(q) ||
        post.representative.toLowerCase().includes(q) ||
        post.category.toLowerCase().includes(q);

      const matchesType = typeFilter === "All" || post.category === typeFilter;
      const matchesStatus = statusFilter === "All" || post.status === statusFilter;
      const matchesUrgency = urgencyFilter === "All" || post.urgency === urgencyFilter;

      return matchesSearch && matchesType && matchesStatus && matchesUrgency;
    });
  }, [feedPosts, search, typeFilter, statusFilter, urgencyFilter]);

  const availableCategories = useMemo(() => {
    const categories = Array.from(new Set(feedPosts.map((post) => post.category).filter(Boolean)));
    return ["All", ...categories];
  }, [feedPosts]);

  async function handleShare(post: FeedPost) {
    const issueUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/feed?post=${encodeURIComponent(post.id)}`
        : "";

    const shareText = `${post.title}\n\n${post.description}\n\nDistrict: ${displayDistrictName(
      post.district
    )}\nRepresentative: ${post.representative}`;

    try {
      setSharingIssueId(post.id);

      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: post.title,
          text: shareText,
          url: issueUrl,
        });
        return;
      }

      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(issueUrl || shareText);
        alert("Issue link copied to clipboard.");
        return;
      }

      alert("Sharing is not supported on this device.");
    } catch (error) {
      console.error("Share error:", error);
    } finally {
      setSharingIssueId(null);
    }
  }

  async function handleToggleUpvote(issueId: string) {
    if (!currentUserId) {
      alert("Please sign in to upvote issues.");
      return;
    }

    const targetPost = feedPosts.find((post) => post.id === issueId);
    if (!targetPost) return;

    if (targetPost.kind !== "issue") {
      setFeedPosts((prev) =>
        prev.map((post) =>
          post.id === issueId
            ? {
                ...post,
                hasUpvoted: !post.hasUpvoted,
                upvotes: post.hasUpvoted ? Math.max(0, post.upvotes - 1) : post.upvotes + 1,
              }
            : post
        )
      );
      return;
    }

    try {
      setTogglingVoteFor(issueId);

      if (targetPost.hasUpvoted) {
        const { error } = await supabase
          .from("issue_votes")
          .delete()
          .eq("issue_id", issueId)
          .eq("user_id", currentUserId);

        if (error) {
          console.error("Remove vote error:", error);
          alert("Could not remove upvote.");
          return;
        }

        setFeedPosts((prev) =>
          prev.map((post) =>
            post.id === issueId
              ? {
                  ...post,
                  hasUpvoted: false,
                  upvotes: Math.max(0, post.upvotes - 1),
                }
              : post
          )
        );
      } else {
        const { error } = await supabase.from("issue_votes").insert({
          issue_id: issueId,
          user_id: currentUserId,
        });

        if (error) {
          console.error("Add vote error:", error);
          alert("Could not add upvote.");
          return;
        }

        setFeedPosts((prev) =>
          prev.map((post) =>
            post.id === issueId
              ? {
                  ...post,
                  hasUpvoted: true,
                  upvotes: post.upvotes + 1,
                }
              : post
          )
        );
      }
    } catch (error) {
      console.error("Toggle vote error:", error);
    } finally {
      setTogglingVoteFor(null);
    }
  }

  function handleToggleComments(itemId: string) {
    setOpenCommentsFor((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  }

  async function handleSubmitComment(itemId: string) {
    const draft = (commentDrafts[itemId] || "").trim();

    if (!draft) return;

    if (!currentUserId) {
      alert("Please sign in to comment.");
      return;
    }

    const targetPost = feedPosts.find((post) => post.id === itemId);
    if (!targetPost) return;

    if (targetPost.kind !== "issue") {
      const localComment: CommentRow = {
        id: `${itemId}-${Date.now()}`,
        issue_id: itemId,
        user_id: currentUserId,
        content: draft,
        created_at: new Date().toISOString(),
      };

      let newCommenterName = "You";

      try {
        const { data: currentProfile } = await supabase
          .from("profiles")
          .select("id, full_name, name, email")
          .eq("id", currentUserId)
          .maybeSingle();

        if (currentProfile) {
          newCommenterName = getProfileDisplayName(currentProfile as ProfileRow);
        }
      } catch (error) {
        console.error("Profile lookup error:", error);
      }

      setCommenterNames((prev) => ({
        ...prev,
        [currentUserId]: newCommenterName,
      }));

      setCommentDrafts((prev) => ({
        ...prev,
        [itemId]: "",
      }));

      setCommentsByIssue((prev) => ({
        ...prev,
        [itemId]: [localComment, ...(prev[itemId] || [])],
      }));

      setFeedPosts((prev) =>
        prev.map((post) =>
          post.id === itemId ? { ...post, comments: post.comments + 1 } : post
        )
      );

      setOpenCommentsFor((prev) => ({
        ...prev,
        [itemId]: true,
      }));

      return;
    }

    try {
      setSubmittingCommentFor(itemId);

      const { data, error } = await supabase
        .from("issue_comments")
        .insert({
          issue_id: itemId,
          user_id: currentUserId,
          content: draft,
        })
        .select("id, issue_id, user_id, content, created_at")
        .single();

      if (error) {
        console.error("Add comment error:", error);
        alert(`Could not add comment: ${error.message}`);
        return;
      }

      const newComment = data as CommentRow;

      let newCommenterName = "You";

      if (currentUserId) {
        const { data: currentProfile } = await supabase
          .from("profiles")
          .select("id, full_name, name, email")
          .eq("id", currentUserId)
          .maybeSingle();

        if (currentProfile) {
          newCommenterName = getProfileDisplayName(currentProfile as ProfileRow);
        }
      }

      setCommenterNames((prev) => ({
        ...prev,
        ...(currentUserId ? { [currentUserId]: newCommenterName } : {}),
      }));

      setCommentDrafts((prev) => ({
        ...prev,
        [itemId]: "",
      }));

      setCommentsByIssue((prev) => ({
        ...prev,
        [itemId]: [newComment, ...(prev[itemId] || [])],
      }));

      setFeedPosts((prev) =>
        prev.map((post) =>
          post.id === itemId ? { ...post, comments: post.comments + 1 } : post
        )
      );

      setOpenCommentsFor((prev) => ({
        ...prev,
        [itemId]: true,
      }));
    } catch (error) {
      console.error("Submit comment error:", error);
      alert("Could not add comment due to an unexpected error.");
    } finally {
      setSubmittingCommentFor(null);
    }
  }

  function openRepresentativeChat(representative: string) {
    const repName = representative || "Representative";

    setChatRepresentative(repName);
    setChatMessages([
      {
        id: `rep-welcome-${Date.now()}`,
        sender: "rep",
        text: `Hello, this is the office of ${repName}. How can we help you today?`,
        time: "Just now",
      },
    ]);
    setChatInput("");
    setChatOpen(true);
  }

  function openVideoMeetingRequest(post: FeedPost) {
    setMeetingRepresentative(post.representative || currentRepresentative);
    setMeetingRepresentativeTitle("District Representative");
    setMeetingForm({
      topic: `Video meeting about: ${post.title}`,
      preferredTimes: "",
      notes: `District feed ${post.kind}: ${post.title}\n\n${post.description}`,
    });
    setMeetingMessage("");
    setMeetingOpen(true);
  }

  async function submitVideoMeetingRequest() {
    if (!currentUserId) {
      setMeetingMessage("Please sign in before requesting a video meeting.");
      return;
    }

    if (!meetingForm.topic.trim() || !meetingForm.preferredTimes.trim()) {
      setMeetingMessage("Please add a topic and at least one preferred meeting time.");
      return;
    }

    try {
      setMeetingSubmitting(true);
      setMeetingMessage("");

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, name, email")
        .eq("id", currentUserId)
        .maybeSingle();

      const { error } = await supabase.from("video_meeting_requests").insert({
        citizen_id: currentUserId,
        citizen_name: getProfileDisplayName(profile as ProfileRow | null),
        citizen_email: (profile as ProfileRow | null)?.email || null,
        district: currentDistrict,
        representative_id: null,
        representative_name: meetingRepresentative,
        representative_title: meetingRepresentativeTitle,
        representative_office: currentDistrict || null,
        topic: meetingForm.topic.trim(),
        preferred_times: meetingForm.preferredTimes.trim(),
        notes: meetingForm.notes.trim() || null,
        status: "pending",
      });

      if (error) {
        console.error("Video meeting request error:", error);
        setMeetingMessage("Unable to submit this request right now.");
        return;
      }

      setMeetingMessage(
        "Request submitted. Staff will approve it before a video link is created."
      );
      setMeetingForm({
        topic: "",
        preferredTimes: "",
        notes: "",
      });
    } catch (error) {
      console.error("Unexpected video meeting request error:", error);
      setMeetingMessage("Unable to submit this request right now.");
    } finally {
      setMeetingSubmitting(false);
    }
  }

  function sendChatMessage() {
    const text = chatInput.trim();
    if (!text) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text,
      time: "Just now",
    };

    const repReply: ChatMessage = {
      id: `rep-${Date.now() + 1}`,
      sender: "rep",
      text: `Thank you for your message. ${chatRepresentative}'s office has received it and will review your concern.`,
      time: "Just now",
    };

    setChatMessages((prev) => [...prev, userMessage, repReply]);
    setChatInput("");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen bg-slate-100 lg:flex">
      <Sidebar />

      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">District Feed</h1>
                <p className="mt-2 text-slate-600">
                  Browse civic issues, track status, and connect with your representative in{" "}
                  <span className="font-semibold text-slate-900">
                    {displayDistrictName(currentDistrict)}
                  </span>
                  .
                </p>
                {debugMessage ? (
                  <p className="mt-3 text-sm text-amber-600">{debugMessage}</p>
                ) : null}
              </div>

              <button
                onClick={handleLogout}
                className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <input
                type="text"
                placeholder="Search issues..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              />

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              >
                {availableCategories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              >
                <option>All</option>
                <option>Open</option>
                <option>Under Review</option>
                <option>Resolved</option>
                <option>Escalated</option>
                <option>Active</option>
                <option>Removed</option>
              </select>

              <select
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              >
                <option>All</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
          </div>

          <div className="space-y-5">
            {loading ? (
              <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
                <p className="text-slate-600">Loading district feed...</p>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
                <p className="text-slate-600">No issues matched your filters.</p>
              </div>
            ) : (
              filteredPosts.map((post) => {
                const itemId = String(post.id);
                const itemComments = commentsByIssue[itemId] || [];
                const commentsOpen = !!openCommentsFor[itemId];
                const draft = commentDrafts[itemId] || "";

                return (
                  <div
                    key={post.id}
                    className={`rounded-2xl bg-white p-6 shadow-sm ${getStatusStyles(post.status)}`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex-1">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getUrgencyBadge(
                              post.urgency
                            )}`}
                          >
                            {post.urgency} Urgency
                          </span>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(
                              post.status
                            )}`}
                          >
                            {post.status}
                          </span>

                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {post.category}
                          </span>

                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {displayDistrictName(post.district)}
                          </span>

                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {post.kind === "post" ? "Post" : "Issue"}
                          </span>
                        </div>

                        <h2 className="text-xl font-bold text-slate-900">{post.title}</h2>

                        <p className="mt-3 text-slate-600">{post.description}</p>

                        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                          <button
                            type="button"
                            onClick={() => handleToggleUpvote(itemId)}
                            disabled={togglingVoteFor === itemId}
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-2 transition ${
                              post.hasUpvoted
                                ? "bg-blue-50 text-blue-700"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            } disabled:opacity-60`}
                          >
                            <span className="text-base">⬆</span>
                            <span>{post.upvotes} upvotes</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleComments(itemId)}
                            className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-slate-700 transition hover:bg-slate-200"
                          >
                            <span className="text-base">💬</span>
                            <span>{post.comments} comments</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleShare(post)}
                            disabled={sharingIssueId === itemId}
                            className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-slate-700 transition hover:bg-slate-200 disabled:opacity-60"
                          >
                            <span className="text-base">↗</span>
                            <span>{sharingIssueId === itemId ? "Sharing..." : "Share"}</span>
                          </button>

                          <span>Representative: {post.representative}</span>
                        </div>

                        {commentsOpen && (
                          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <h3 className="text-sm font-semibold text-slate-900">Comments</h3>

                            <div className="mt-3 flex gap-3">
                              <input
                                type="text"
                                value={draft}
                                onChange={(e) =>
                                  setCommentDrafts((prev) => ({
                                    ...prev,
                                    [itemId]: e.target.value,
                                  }))
                                }
                                placeholder="Write a comment..."
                                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                              />

                              <button
                                type="button"
                                onClick={() => handleSubmitComment(itemId)}
                                disabled={submittingCommentFor === itemId || !draft.trim()}
                                className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {submittingCommentFor === itemId ? "Posting..." : "Post"}
                              </button>
                            </div>

                            <div className="mt-4 space-y-3">
                              {itemComments.length === 0 ? (
                                <p className="text-sm text-slate-500">No comments yet.</p>
                              ) : (
                                itemComments.map((comment, idx) => {
                                  const commenterName =
                                    (comment.user_id && commenterNames[comment.user_id]) ||
                                    "Citizen";

                                  return (
                                    <div
                                      key={comment.id || `${itemId}-${idx}`}
                                      className="rounded-xl bg-white px-4 py-3 text-sm text-slate-700"
                                    >
                                      <div className="font-semibold text-slate-900">
                                        {commenterName}
                                      </div>
                                      <div className="mt-1">{comment.content || "No comment text"}</div>
                                      {comment.created_at ? (
                                        <div className="mt-1 text-xs text-slate-400">
                                          {new Date(comment.created_at).toLocaleString()}
                                        </div>
                                      ) : null}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex w-full flex-col gap-3 lg:w-64">
                        <button
                          onClick={() => openRepresentativeChat(post.representative)}
                          className="rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700"
                        >
                          Chat with my representative
                        </button>

                        <button
                          onClick={() => openVideoMeetingRequest(post)}
                          className="rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700"
                        >
                          Video Call with my representative
                        </button>

                        <button
                          onClick={() => openRepresentativeChat(post.representative)}
                          className="rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          View representative thread
                        </button>

                        <button
                          type="button"
                          onClick={() => handleShare(post)}
                          disabled={sharingIssueId === itemId}
                          className="flex items-center justify-center rounded-xl border border-slate-300 px-4 py-3 text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                          aria-label="Share issue"
                          title="Share issue"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="h-6 w-6"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M7 17V7a2 2 0 0 1 2-2h4" />
                            <path d="M14 3l7 7-7 7" />
                            <path d="M21 10H9a2 2 0 0 0-2 2v9" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {!loading && filteredPosts.length > 0 && (
            <div className="mt-6 rounded-2xl bg-white p-4 text-sm text-slate-500 shadow-sm">
              Showing {filteredPosts.length} item{filteredPosts.length === 1 ? "" : "s"} for{" "}
              <span className="font-semibold text-slate-700">
                {displayDistrictName(currentDistrict)}
              </span>
              . Primary representative:{" "}
              <span className="font-semibold text-slate-700">{currentRepresentative}</span>.
            </div>
          )}
        </div>
      </main>

      {chatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Representative Chat
                </p>
                <h3 className="mt-1 text-2xl font-bold text-slate-900">
                  Chat with {chatRepresentative}
                </h3>
              </div>

              <button
                onClick={() => setChatOpen(false)}
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                aria-label="Close chat"
              >
                ✕
              </button>
            </div>

            <div className="h-[380px] overflow-y-auto px-6 py-5">
              <div className="space-y-4">
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-7 ${
                        message.sender === "user"
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-800"
                      }`}
                    >
                      <div>{message.text}</div>
                      <div
                        className={`mt-1 text-xs ${
                          message.sender === "user" ? "text-blue-100" : "text-slate-500"
                        }`}
                      >
                        {message.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-200 px-6 py-5">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") sendChatMessage();
                  }}
                  placeholder={`Message ${chatRepresentative}...`}
                  className="flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400"
                />
                <button
                  onClick={sendChatMessage}
                  disabled={!chatInput.trim()}
                  className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {meetingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Video Call Request
                </p>
                <h3 className="mt-1 text-2xl font-bold text-slate-900">
                  {meetingRepresentative}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  A meeting link is created only after staff approval.
                </p>
              </div>

              <button
                onClick={() => setMeetingOpen(false)}
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                aria-label="Close video meeting request"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Meeting topic
                </label>
                <input
                  value={meetingForm.topic}
                  onChange={(event) =>
                    setMeetingForm((prev) => ({
                      ...prev,
                      topic: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Preferred times
                </label>
                <textarea
                  value={meetingForm.preferredTimes}
                  onChange={(event) =>
                    setMeetingForm((prev) => ({
                      ...prev,
                      preferredTimes: event.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Share 2-3 windows with timezone, such as Tue 2-4 PM ET"
                  className="w-full resize-none rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Notes for staff
                </label>
                <textarea
                  value={meetingForm.notes}
                  onChange={(event) =>
                    setMeetingForm((prev) => ({
                      ...prev,
                      notes: event.target.value,
                    }))
                  }
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400"
                />
              </div>

              {meetingMessage ? (
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
                  {meetingMessage}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-6 py-5 sm:flex-row sm:justify-end">
              <button
                onClick={() => setMeetingOpen(false)}
                className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={submitVideoMeetingRequest}
                disabled={meetingSubmitting}
                className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {meetingSubmitting ? "Submitting..." : "Submit Video Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
