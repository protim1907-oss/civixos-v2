import { ReactNode } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNavbar } from "@/components/layout/topnavbar"

type AppShellProps = {
  children: ReactNode
  title?: string
}

export function AppShell({ children, title }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <TopNavbar title={title} />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </div>
  )
}