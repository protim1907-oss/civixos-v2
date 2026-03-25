"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"

type TopNavbarProps = {
  title?: string
}

export function TopNavbar({ title = "Dashboard" }: TopNavbarProps) {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState("")

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser()
      setUserEmail(data.user?.email || "")
    }

    getUser()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  function getInitial(email: string) {
    return email ? email.charAt(0).toUpperCase() : "U"
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      
      {/* Left: Logo + App Name */}
      <Link href="/dashboard" className="flex items-center gap-3">
        <Image
          src="/civixos-logo.png"
          alt="CivixOS Logo"
          width={32}
          height={32}
          className="rounded-md"
        />
        <span className="text-lg font-semibold text-slate-900">
          CivixOS
        </span>
      </Link>

      {/* Right: User Info + Logout */}
      <div className="flex items-center gap-4">
        
        {/* User Avatar + Email */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
            {getInitial(userEmail)}
          </div>

          <span className="hidden sm:block text-sm text-slate-700">
            {userEmail}
          </span>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition"
        >
          Logout
        </button>
      </div>
    </header>
  )
}