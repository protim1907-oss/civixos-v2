"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "../../../lib/supabase"
import { AppShell } from "@/components/layout/appshell"
import { Button } from "@/components/ui/button"

export default function ChatPage() {
  const params = useParams()
  const repName = decodeURIComponent(params.name as string)

  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    loadUser()
    loadMessages()
  }, [])

  async function loadUser() {
    const { data } = await supabase.auth.getUser()
    setUserId(data.user?.id || null)
  }

  async function loadMessages() {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("receiver_name", repName)
      .order("created_at", { ascending: true })

    setMessages(data || [])
  }

  async function sendMessage() {
    if (!newMessage.trim()) return

    const { error } = await supabase.from("messages").insert([
      {
        sender_id: userId,
        receiver_name: repName,
        message: newMessage,
      },
    ])

    if (!error) {
      setNewMessage("")
      loadMessages()
    }
  }

  return (
    <AppShell title={`Chat with ${repName}`}>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-bold mb-4">
          Chat with {repName}
        </h1>

        <div className="border rounded-xl p-4 h-[400px] overflow-y-auto mb-4">
          {messages.map((msg) => (
            <div key={msg.id} className="mb-3">
              <div className="text-sm text-slate-700">
                {msg.message}
              </div>
              <div className="text-xs text-slate-400">
                {new Date(msg.created_at).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            className="flex-1 border rounded-lg px-3 py-2"
            placeholder="Type a message"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <Button onClick={sendMessage}>Send</Button>
        </div>
      </div>
    </AppShell>
  )
}