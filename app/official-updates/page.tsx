import { redirect } from "next/navigation";

// The Official Updates section is temporarily removed until representatives are
// signed in. This route now redirects to the dashboard. The full page
// implementation remains in git history — restore it here (and re-add the
// sidebar nav entry in components/layout/Sidebar.tsx) when bringing it back.
export default function OfficialUpdatesPage() {
  redirect("/dashboard");
}
