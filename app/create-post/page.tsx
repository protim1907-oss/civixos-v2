"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, User } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export default function CreateIssuePage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        setErrorMessage("Could not verify login status. Please refresh and try again.");
        setCheckingAuth(false);
        return;
      }

      setUser(session?.user ?? null);
      setCheckingAuth(false);
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle || !trimmedDescription) {
      setErrorMessage("Please complete both the title and description.");
      return;
    }

    setIsSubmitting(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        setErrorMessage("Could not verify your login session. Please try again.");
        setIsSubmitting(false);
        return;
      }

      const currentUser = session?.user ?? null;

      if (!currentUser) {
        setErrorMessage("You must be logged in to create an issue.");
        setIsSubmitting(false);
        return;
      }

      const { error: insertError } = await supabase.from("issues").insert([
        {
          title: trimmedTitle,
          description: trimmedDescription,
          user_id: currentUser.id,
          status: "open",
        },
      ]);

      if (insertError) {
        setErrorMessage(insertError.message || "Failed to create issue.");
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage("Issue created successfully.");
      setTitle("");
      setDescription("");

      setTimeout(() => {
        router.push("/dashboard");
      }, 1200);
    } catch {
      setErrorMessage("Something went wrong while creating the issue.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoToLogin() {
    router.push("/login");
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-[36px] border border-slate-200 bg-white px-8 py-10 shadow-sm md:px-14 md:py-14">
          <h1 className="text-4xl font-bold tracking-tight text-slate-950 md:text-6xl">
            Create Civic Issue
          </h1>
          <p className="mt-5 text-xl text-slate-600 md:text-2xl">
            Submit a concern for your district.
          </p>

          {checkingAuth ? (
            <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 text-slate-600">
              Checking login status...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-12 space-y-10">
              <div>
                <label
                  htmlFor="title"
                  className="mb-4 block text-xl font-medium text-slate-700"
                >
                  Title
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Waterlogging in District 12"
                  className="w-full rounded-[28px] border border-slate-300 bg-slate-50 px-7 py-6 text-2xl text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="mb-4 block text-xl font-medium text-slate-700"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  rows={8}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Residents in District 12 are reporting frequent drain overflows, leading to waterlogging, foul odor, and potential health risks..."
                  className="w-full rounded-[28px] border border-slate-300 bg-slate-50 px-7 py-6 text-2xl leading-relaxed text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                />
              </div>

              {errorMessage && (
                <div className="rounded-[26px] border border-red-200 bg-red-50 px-7 py-5 text-xl text-red-700">
                  {errorMessage}
                </div>
              )}

              {successMessage && (
                <div className="rounded-[26px] border border-emerald-200 bg-emerald-50 px-7 py-5 text-xl text-emerald-700">
                  {successMessage}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="submit"
                  disabled={isSubmitting || checkingAuth}
                  className="rounded-2xl bg-slate-950 px-7 py-4 text-lg font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Submitting..." : "Create Issue"}
                </button>

                {!user && !checkingAuth && (
                  <button
                    type="button"
                    onClick={handleGoToLogin}
                    className="rounded-2xl border border-slate-300 bg-white px-7 py-4 text-lg font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Go to Login
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}