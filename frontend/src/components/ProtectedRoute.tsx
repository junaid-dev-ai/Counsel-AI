import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, loadUser } = useStore()
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) { navigate('/login'); return }
    if (!user) loadUser()
  }, [])

  useEffect(() => {
    if (!isLoading && !user) {
      const token = localStorage.getItem('access_token')
      if (!token) navigate('/login')
    }
  }, [user, isLoading])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-ink-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-ink-300 font-sans text-sm">Loading…</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
