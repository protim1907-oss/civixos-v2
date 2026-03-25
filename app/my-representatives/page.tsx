"use client"

import Image from "next/image"
import { AppShell } from "@/components/layout/appshell"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type Representative = {
  id: number
  name: string
  title: string
  district: string
  image: string
  email: string
  linkedin: string
}

const representatives: Representative[] = [
  {
    id: 1,
    name: "Sarah Mitchell",
    title: "City Council Member",
    district: "District 12",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80",
    email: "sarah.mitchell@cityoffice.gov",
    linkedin: "https://www.linkedin.com/in/sarah-mitchell-demo",
  },
  {
    id: 2,
    name: "Daniel Brooks",
    title: "State Representative",
    district: "District 12",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80",
    email: "daniel.brooks@stateoffice.gov",
    linkedin: "https://www.linkedin.com/in/daniel-brooks-demo",
  },
  {
    id: 3,
    name: "Priya Raman",
    title: "County Commissioner",
    district: "District 12",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=600&q=80",
    email: "priya.raman@countyoffice.gov",
    linkedin: "https://www.linkedin.com/in/priya-raman-demo",
  },
  {
    id: 4,
    name: "James Carter",
    title: "School Board Member",
    district: "District 12",
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80",
    email: "james.carter@schoolboard.gov",
    linkedin: "https://www.linkedin.com/in/james-carter-demo",
  },
  {
    id: 5,
    name: "Elena Cruz",
    title: "Public Works Liaison",
    district: "District 12",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80",
    email: "elena.cruz@publicworks.gov",
    linkedin: "https://www.linkedin.com/in/elena-cruz-demo",
  },
  {
    id: 6,
    name: "Michael Turner",
    title: "Transportation Advisor",
    district: "District 12",
    image: "https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=600&q=80",
    email: "michael.turner@transport.gov",
    linkedin: "https://www.linkedin.com/in/michael-turner-demo",
  },
  {
    id: 7,
    name: "Ayesha Khan",
    title: "Housing Committee Lead",
    district: "District 12",
    image: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=600&q=80",
    email: "ayesha.khan@housingoffice.gov",
    linkedin: "https://www.linkedin.com/in/ayesha-khan-demo",
  },
  {
    id: 8,
    name: "Robert Hayes",
    title: "District Outreach Director",
    district: "District 12",
    image: "https://images.unsplash.com/photo-1504257432389-52343af06ae3?auto=format&fit=crop&w=600&q=80",
    email: "robert.hayes@districtoffice.gov",
    linkedin: "https://www.linkedin.com/in/robert-hayes-demo",
  },
  {
    id: 9,
    name: "Maria Lopez",
    title: "Community Affairs Officer",
    district: "District 12",
    image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80",
    email: "maria.lopez@communityoffice.gov",
    linkedin: "https://www.linkedin.com/in/maria-lopez-demo",
  },
  {
    id: 10,
    name: "Kevin Foster",
    title: "Legislative Aide",
    district: "District 12",
    image: "https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?auto=format&fit=crop&w=600&q=80",
    email: "kevin.foster@legislativeoffice.gov",
    linkedin: "https://www.linkedin.com/in/kevin-foster-demo",
  },
]

export default function MyRepresentativesPage() {
  function handleChat(name: string) {
    alert(`Start chat with ${name}`)
  }

  return (
    <AppShell title="My Representatives">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-medium text-slate-500">Citizen Services</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            My Representatives
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Connect with your district representatives, send emails to their offices,
            chat with them, or view their professional profiles.
          </p>
        </div>
      </div>

      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Representatives for District 12
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Browse your civic representatives and contact channels.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {representatives.map((rep) => (
            <div
              key={rep.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
            >
              <div className="relative h-52 w-full">
                <Image
                  src={rep.image}
                  alt={rep.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>

              <div className="p-5">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {rep.name}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-slate-700">
                    {rep.title}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {rep.district}
                  </p>
                </div>

                <div className="space-y-3">
                  <Button
                    fullWidth
                    onClick={() => {
  window.location.href = `/chat/${encodeURIComponent(rep.name)}`
}}
                  >
                    Chat
                  </Button>

                  <a
                    href={`mailto:${rep.email}`}
                    className="block"
                  >
                    <button
                      type="button"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Email Office
                    </button>
                  </a>

                  <a
                    href={rep.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <button
                      type="button"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      View LinkedIn
                    </button>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </AppShell>
  )
}