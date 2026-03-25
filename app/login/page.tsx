"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
  e.preventDefault()
  setLoading(true)

  try {
    console.log("Trying login with:", email)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    console.log("Supabase response:", { data, error })

    if (error) {
      alert(error.message)
      return
    }

    window.location.href = "/dashboard"
  } catch (error) {
    console.error("Login error:", error)
    alert("Something went wrong during sign in.")
  } finally {
    setLoading(false)
  }

    setLoading(true)

    try {
      async function handleLogin(e: React.FormEvent) {
  e.preventDefault()
  setLoading(true)

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert(error.message)
      return
    }

    window.location.href = "/dashboard"
  } catch (error) {
    console.error(error)
    alert("Something went wrong during sign in.")
  } finally {
    setLoading(false)
  }
}
      console.log("Logging in:", { email, password })
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-12">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl md:grid-cols-2">
          <div className="hidden bg-slate-900 p-10 text-white md:flex md:flex-col md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
                CivixOS
              </p>
              <h1 className="mt-6 text-4xl font-bold leading-tight">
                Civic engagement made structured, visible, and actionable.
              </h1>
              <p className="mt-4 max-w-md text-sm text-slate-300">
                Log in to view your district dashboard, create civic issues,
                and track resolutions in one place.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-800/70 p-5">
              <p className="text-sm text-slate-300">
                Unified experience for citizens, moderators, and administrators.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center p-6 sm:p-10">
            <Card className="w-full max-w-md border-0 shadow-none">
              <div className="p-2">
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-slate-900">Welcome back</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Sign in to continue to your CivixOS workspace.
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                  <Input
                    label="Email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />

                  <Input
                    label="Password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />

                  <div className="flex items-center justify-end">
                    <Link
                      href="/forgot-password"
                      className="text-sm font-medium text-slate-700 hover:text-slate-900"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <Button type="submit" fullWidth disabled={loading}>
                    {loading ? "Signing in..." : "Sign in"}
                  </Button>
                </form>

                <p className="mt-6 text-center text-sm text-slate-600">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/signup"
                    className="font-semibold text-slate-900 hover:underline"
                  >
                    Create account
                  </Link>
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}