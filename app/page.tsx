'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type District = {
  id: string
  name: string
  state_code: string | null
  district_code: string
}

export default function Home() {
  const supabase = createClient()

  const [districts, setDistricts] = useState<District[]>([])
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [districtId, setDistrictId] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function loadDistricts() {
      const { data, error } = await supabase
        .from('districts')
        .select('id, name, state_code, district_code')
        .order('name', { ascending: true })

      if (error) {
        setMessage(error.message)
        return
      }

      setDistricts(data || [])
    }

    loadDistricts()
  }, [supabase])

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (signUpError) {
      setMessage(signUpError.message)
      setLoading(false)
      return
    }

    const user = signUpData.user

    if (!user) {
      setMessage('Signup succeeded, but no user was returned.')
      setLoading(false)
      return
    }

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: user.id,
      full_name: fullName,
      email,
      district_id: districtId || null,
      role: 'citizen',
    })

    if (profileError) {
      setMessage(profileError.message)
      setLoading(false)
      return
    }

    setMessage('Signup successful. Check your email for confirmation if enabled.')
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">CivixOS Onboarding</h1>
        <p className="mt-2 text-sm text-slate-600">
          Create your citizen account and select your district.
        </p>

        <form onSubmit={handleSignUp} className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Full name
            </label>
            <input
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              type="password"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              District
            </label>
            <select
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
              value={districtId}
              onChange={(e) => setDistrictId(e.target.value)}
              required
            >
              <option value="">Select your district</option>
              {districts.map((district) => (
                <option key={district.id} value={district.id}>
                  {district.name} ({district.state_code}-{district.district_code})
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 font-medium text-white disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>

          {message && (
            <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
              {message}
            </div>
          )}
        </form>
      </div>
    </main>
  )
}