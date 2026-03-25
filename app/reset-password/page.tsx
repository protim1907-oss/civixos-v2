"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { supabase } from "../../lib/supabase"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault()

    if (password !== confirmPassword) {
      alert("Passwords do not match.")
      return
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters long.")
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      })

      if (error) {
        alert(error.message)
        return
      }

      alert("Password updated successfully. Please sign in.")
      router.push("/login")
    } catch (error) {
      console.error(error)
      alert("Something went wrong while updating your password.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-12">
        <Card className="w-full max-w-md p-8">
          <h1 className="text-2xl font-bold text-slate-900">Reset Password</h1>
          <p className="mt-2 text-sm text-slate-600">
            Enter your new password below.
          </p>

          <form onSubmit={handleUpdatePassword} className="mt-6 space-y-5">
            <Input
              label="New Password"
              type="password"
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <Button type="submit" fullWidth disabled={loading}>
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  )
}