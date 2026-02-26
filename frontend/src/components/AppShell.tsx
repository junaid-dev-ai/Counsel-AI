import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../lib/store'
import UploadModal from './UploadModal'
import {
  Scale, LayoutDashboard, LogOut, Menu, X,
  Upload, ChevronRight, Zap,
} from 'lucide-react'
import clsx from 'clsx'

const PLAN_COLORS = {
  free:       'text-ink-300 bg-ink-700 border-ink-500',
  pro:        'text-gold-400 bg-gold-500/10 border-gold-500/30',
  enterprise: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
}

export default function AppShell() {
  const { user, logout, sidebarOpen, toggleSidebar, uploadModalOpen, setUploadModal } = useStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-ink-900 overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="flex-shrink-0 h-full bg-ink-800 border-r border-ink-600 
                       flex flex-col overflow-hidden z-20"
          >
            {/* Logo */}
            <div className="flex items-center gap-3 px-6 py-5 border-b border-ink-600">
              <div className="w-8 h-8 bg-gold-500 rounded-lg flex items-center justify-center">
                <Scale size={16} className="text-ink-900" />
              </div>
              <div>
                <span className="font-display text-lg font-semibold text-parchment-100 tracking-wide">
                  Counsel<span className="text-gold-400">AI</span>
                </span>
              </div>
            </div>

            {/* Upload CTA */}
            <div className="px-4 pt-4">
              <button
                onClick={() => setUploadModal(true)}
                className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl
                           bg-gold-500 hover:bg-gold-400 text-ink-900 font-sans 
                           font-semibold text-sm transition-all duration-200
                           hover:shadow-lg hover:shadow-gold-500/20 group"
              >
                <Upload size={15} />
                Analyze Contract
                <ChevronRight size={13} className="ml-auto group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-4 pt-4 pb-2 space-y-1">
              <NavLink
                to="/dashboard"
                className={({ isActive }) => clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg font-sans text-sm transition-all duration-200',
                  isActive
                    ? 'bg-ink-600 text-parchment-100'
                    : 'text-ink-300 hover:text-ink-100 hover:bg-ink-700'
                )}
              >
                <LayoutDashboard size={16} />
                Dashboard
              </NavLink>
            </nav>

            {/* User info */}
            <div className="p-4 border-t border-ink-600">
              {/* Plan badge */}
              <div className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono font-medium w-fit mb-3 uppercase tracking-wider',
                PLAN_COLORS[user?.plan ?? 'free']
              )}>
                <Zap size={10} />
                {user?.plan ?? 'free'}
              </div>

              {/* Usage bar */}
              {user && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-ink-400 font-mono mb-1">
                    <span>Analyses this month</span>
                    <span>{user.analyses_this_month}</span>
                  </div>
                  <div className="h-1 bg-ink-600 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gold-500 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (user.analyses_this_month / 3) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-sans font-medium text-ink-100 truncate">
                    {user?.full_name}
                  </p>
                  <p className="text-xs text-ink-400 font-mono truncate">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  title="Log out"
                  className="ml-2 p-2 text-ink-400 hover:text-red-400 hover:bg-red-500/10 
                             rounded-lg transition-colors shrink-0"
                >
                  <LogOut size={15} />
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-14 flex items-center gap-3 px-6 border-b border-ink-600 bg-ink-800/50 shrink-0">
          <button
            onClick={toggleSidebar}
            className="p-1.5 text-ink-400 hover:text-ink-200 hover:bg-ink-700 rounded-lg transition-colors"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          {!sidebarOpen && (
            <div className="flex items-center gap-2">
              <Scale size={16} className="text-gold-400" />
              <span className="font-display text-lg font-semibold text-parchment-100">
                Counsel<span className="text-gold-400">AI</span>
              </span>
            </div>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      {/* Upload modal */}
      <UploadModal open={uploadModalOpen} onClose={() => setUploadModal(false)} />
    </div>
  )
}
