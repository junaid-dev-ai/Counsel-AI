import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { authApi } from '../lib/api'
import { useStore } from '../lib/store'
import { Scale, Eye, EyeOff, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'

function AuthLayout({ children, title, subtitle }: {
  children: React.ReactNode; title: string; subtitle: string
}) {
  return (
    <div className="min-h-screen bg-ink-900 flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-2/5 bg-ink-800 border-r border-ink-600 p-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gold-500 rounded-lg flex items-center justify-center">
            <Scale size={16} className="text-ink-900" />
          </div>
          <span className="font-display text-xl font-semibold text-parchment-100">
            Counsel<span className="text-gold-400">AI</span>
          </span>
        </div>

        <div>
          <blockquote className="font-display text-2xl italic text-parchment-200 leading-relaxed mb-6">
            "I almost signed a contract that would have given away all my IP forever. CounselAI caught it in 30 seconds."
          </blockquote>
          <p className="text-sm text-ink-400 font-mono">— Freelance developer, San Francisco</p>
        </div>

        <div className="flex gap-4">
          {['3 free analyses', 'No credit card', 'Instant results'].map(f => (
            <div key={f} className="text-xs text-ink-400 font-mono px-2 py-1 bg-ink-700 rounded border border-ink-600">
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Scale size={16} className="text-gold-400" />
            <span className="font-display text-xl font-semibold text-parchment-100">
              Counsel<span className="text-gold-400">AI</span>
            </span>
          </div>
          <h1 className="font-display text-3xl font-bold text-parchment-100 mb-1">{title}</h1>
          <p className="text-sm text-ink-400 mb-8">{subtitle}</p>
          {children}
        </motion.div>
      </div>
    </div>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const { loadUser } = useStore()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.login(email, password)
      await loadUser()
      navigate('/dashboard')
    } catch {
      // toast already shown by API interceptor
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your CounselAI account">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-mono text-ink-400 mb-1.5 uppercase tracking-wider">Email</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@company.com" required
            className="input"
          />
        </div>
        <div>
          <label className="block text-xs font-mono text-ink-400 mb-1.5 uppercase tracking-wider">Password</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'} value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required
              className="input pr-10"
            />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-200">
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
        <button type="submit" disabled={loading}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2">
          {loading ? <span className="w-4 h-4 border-2 border-ink-900 border-t-transparent rounded-full animate-spin" /> : null}
          {loading ? 'Signing in…' : 'Sign in'}
          {!loading && <ArrowRight size={15} />}
        </button>
      </form>
      <p className="text-sm text-ink-400 text-center mt-6">
        Don't have an account?{' '}
        <Link to="/register" className="text-gold-400 hover:underline underline-offset-2">Create one free</Link>
      </p>
    </AuthLayout>
  )
}

export function RegisterPage() {
  const navigate = useNavigate()
  const { loadUser } = useStore()
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.register(email, name, password)
      await loadUser()
      toast.success('Account created! Analyze your first contract.')
      navigate('/dashboard')
    } catch {
      // toast shown by interceptor
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Start for free" subtitle="No credit card required · 3 free analyses per month">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-mono text-ink-400 mb-1.5 uppercase tracking-wider">Full Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="Jane Smith" required minLength={2} className="input" />
        </div>
        <div>
          <label className="block text-xs font-mono text-ink-400 mb-1.5 uppercase tracking-wider">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@company.com" required className="input" />
        </div>
        <div>
          <label className="block text-xs font-mono text-ink-400 mb-1.5 uppercase tracking-wider">Password</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'} value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min 8 chars with a number" required minLength={8}
              className="input pr-10"
            />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-200">
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
        <button type="submit" disabled={loading}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2">
          {loading ? <span className="w-4 h-4 border-2 border-ink-900 border-t-transparent rounded-full animate-spin" /> : null}
          {loading ? 'Creating account…' : 'Create free account'}
          {!loading && <ArrowRight size={15} />}
        </button>
      </form>
      <p className="text-xs text-ink-500 text-center mt-4 font-mono">
        By signing up you agree to our Terms of Service
      </p>
      <p className="text-sm text-ink-400 text-center mt-4">
        Already have an account?{' '}
        <Link to="/login" className="text-gold-400 hover:underline underline-offset-2">Sign in</Link>
      </p>
    </AuthLayout>
  )
}

export default LoginPage
