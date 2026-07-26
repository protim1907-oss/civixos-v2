"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Video, PhoneOff } from "lucide-react"

const JAAS_APP_ID = process.env.NEXT_PUBLIC_JAAS_APP_ID || ""

// Embedded JaaS (8x8.vc) meeting room. Used for approved citizen↔official video
// meetings and town halls — the same JWT-secured flow as Community Chat, instead
// of a public meet.jit.si link.
export default function MeetingRoomPage() {
  const params = useParams()
  const router = useRouter()
  const room = decodeURIComponent((params.room as string) || "")
  const supabase = createClient()

  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Jitsi CDN global is untyped
  const apiRef = useRef<any>(null)
  const [error, setError] = useState("")
  const [displayName, setDisplayName] = useState("")

  const roomName = `${JAAS_APP_ID}/${room.replace(/[^a-zA-Z0-9-]/g, "")}`

  useEffect(() => {
    let cancelled = false

    async function start() {
      // Resolve a display name for the tile
      const { data: authData } = await supabase.auth.getUser()
      if (authData.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", authData.user.id)
          .maybeSingle()
        if (!cancelled) {
          setDisplayName(profile?.full_name || profile?.email || authData.user.email || "Civix250 User")
        }
      }

      // Mint the JaaS JWT server-side
      let jwt = ""
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const accessToken = sessionData.session?.access_token
        const res = await fetch("/api/jaas-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        })
        const body = await res.json()
        if (!res.ok || !body.jwt) {
          if (!cancelled) setError(body.error || "Could not start the meeting.")
          return
        }
        jwt = body.jwt
      } catch {
        if (!cancelled) setError("Could not reach the video service.")
        return
      }

      if (cancelled || !containerRef.current) return

      function initJaas() {
        if (cancelled || !containerRef.current) return
        if (apiRef.current) {
          apiRef.current.dispose()
          apiRef.current = null
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Jitsi CDN global is untyped
        const api = new (window as any).JitsiMeetExternalAPI("8x8.vc", {
          roomName,
          jwt,
          parentNode: containerRef.current,
          userInfo: { displayName: displayName || "Civix250 User" },
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            prejoinPageEnabled: true,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
          },
        })
        api.addListener?.("readyToClose", () => router.push("/dashboard"))
        apiRef.current = api
      }

      const scriptId = "jaas-external-api"
      const existing = document.getElementById(scriptId)
      if (existing) {
        initJaas()
      } else {
        const script = document.createElement("script")
        script.id = scriptId
        script.src = `https://8x8.vc/${JAAS_APP_ID}/external_api.js`
        script.async = true
        script.onload = initJaas
        document.head.appendChild(script)
      }
    }

    start()

    return () => {
      cancelled = true
      if (apiRef.current) {
        apiRef.current.dispose()
        apiRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between bg-slate-900 px-4 py-3">
        <div className="flex items-center gap-2 text-white">
          <Video className="h-4 w-4 text-green-400" />
          <span className="text-sm font-semibold">Civix250 Video Meeting</span>
        </div>
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
        >
          <PhoneOff className="h-4 w-4" />
          Leave
        </button>
      </div>
      <div className="relative flex-1 w-full">
        <div ref={containerRef} className="h-full w-full" />
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="max-w-md rounded-2xl bg-white p-6 text-center shadow-xl">
              <p className="text-sm font-semibold text-slate-900">
                Unable to join the meeting
              </p>
              <p className="mt-2 text-sm text-slate-500">{error}</p>
              <p className="mt-2 text-xs text-slate-400">
                Video meetings require a signed-in Civix250 account.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
