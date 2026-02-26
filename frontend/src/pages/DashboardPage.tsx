import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { contractsApi } from '../lib/api'
import { useStore } from '../lib/store'
import { RiskPill } from '../components/RiskComponents'
import type { RiskLevel } from '../types'
import {
  FileText, Upload, Clock, CheckCircle2, AlertTriangle,
  TrendingUp, ChevronRight, Loader2, AlertCircle, Trash2,
} from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'

const STATUS_CONFIG = {
  queued:     { icon: Clock,        color: 'text-ink-400',   label: 'Queued',     bg: 'bg-ink-600/30' },
  processing: { icon: Loader2,      color: 'text-gold-400',  label: 'Analyzing…', bg: 'bg-gold-500/10' },
  complete:   { icon: CheckCircle2, color: 'text-green-400', label: 'Complete',   bg: 'bg-green-500/10' },
  failed:     { icon: AlertCircle,  color: 'text-red-400',   label: 'Failed',     bg: 'bg-red-500/10' },
}

export default function DashboardPage() {
  const { contracts, stats, setContracts, setStats, setUploadModal, removeContract } = useStore()

  const { data: fetchedContracts, isLoading: contractsLoading, refetch } = useQuery({
    queryKey: ['contracts'],
    queryFn:  () => contractsApi.list(),
    refetchInterval: (data) => {
      // Keep polling if any contract is processing
      const hasProcessing = data?.some(c => c.status === 'queued' || c.status === 'processing')
      return hasProcessing ? 3000 : false
    },
  })

  const { data: fetchedStats } = useQuery({
    queryKey: ['stats'],
    queryFn:  () => contractsApi.stats(),
    refetchInterval: 10_000,
  })

  useEffect(() => { if (fetchedContracts) setContracts(fetchedContracts) }, [fetchedContracts])
  useEffect(() => { if (fetchedStats)    setStats(fetchedStats) }, [fetchedStats])

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return
    try {
      await contractsApi.delete(id)
      removeContract(id)
      toast.success('Contract deleted')
    } catch {
      toast.error('Delete failed')
    }
  }

  const usagePct = stats ? Math.min(100, (stats.analyses_used / stats.analyses_limit) * 100) : 0

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-parchment-100 mb-1">Dashboard</h1>
          <p className="text-sm text-ink-400">Review and manage your contract analyses</p>
        </div>
        <button onClick={() => setUploadModal(true)} className="btn-primary flex items-center gap-2">
          <Upload size={15} />
          Analyze Contract
        </button>
      </div>

      {/* Stats row */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          {[
            { label: 'Total Contracts', value: stats.total_contracts, icon: FileText, color: 'text-ink-300' },
            { label: 'Analyzed',        value: stats.completed,       icon: CheckCircle2, color: 'text-green-400' },
            { label: 'Critical Risk',   value: stats.critical_risk,   icon: AlertTriangle, color: 'text-violet-400' },
            { label: 'Avg Risk Score',  value: `${stats.avg_risk_score}`, icon: TrendingUp, color: 'text-gold-400', suffix: '/100' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="card p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs text-ink-400 font-mono uppercase tracking-wider">{s.label}</p>
                <s.icon size={15} className={s.color} />
              </div>
              <div className="font-display text-3xl font-bold text-parchment-100">
                {s.value}
                {s.suffix && <span className="text-lg text-ink-400 ml-1">{s.suffix}</span>}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Usage bar */}
      {stats && (
        <div className="card p-4 mb-8 flex items-center gap-6">
          <div className="text-sm text-ink-400 font-mono shrink-0">
            Monthly usage:
            <span className="text-gold-400 ml-1">{stats.analyses_used}</span>
            <span className="text-ink-500"> / {stats.analyses_limit}</span>
          </div>
          <div className="flex-1 h-2 bg-ink-600 rounded-full overflow-hidden">
            <motion.div
              className={clsx('h-full rounded-full', usagePct >= 90 ? 'bg-red-500' : usagePct >= 70 ? 'bg-amber-500' : 'bg-gold-500')}
              initial={{ width: 0 }}
              animate={{ width: `${usagePct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          {stats.plan === 'free' && (
            <button className="btn-primary py-1.5 text-xs shrink-0">Upgrade</button>
          )}
        </div>
      )}

      {/* Contract list */}
      <div>
        <h2 className="font-display text-xl font-semibold text-parchment-100 mb-4">Recent Contracts</h2>

        {contractsLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="text-gold-400 animate-spin" />
          </div>
        )}

        {!contractsLoading && contracts.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="card p-12 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-ink-700 border border-ink-500 flex items-center justify-center mx-auto mb-4">
              <FileText size={24} className="text-ink-400" />
            </div>
            <h3 className="font-display text-xl text-parchment-200 mb-2">No contracts yet</h3>
            <p className="text-sm text-ink-400 mb-6 max-w-xs mx-auto">Upload your first contract to get an instant AI-powered risk analysis.</p>
            <button onClick={() => setUploadModal(true)} className="btn-primary inline-flex items-center gap-2">
              <Upload size={15} />
              Upload your first contract
            </button>
          </motion.div>
        )}

        <div className="space-y-3">
          {contracts.map((contract, i) => {
            const sc = STATUS_CONFIG[contract.status]
            const StatusIcon = sc.icon

            return (
              <motion.div
                key={contract.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card p-4 hover:border-ink-500 transition-all group"
              >
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', sc.bg)}>
                    <StatusIcon size={16} className={clsx(sc.color, contract.status === 'processing' && 'animate-spin')} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-sans font-medium text-parchment-100 truncate">{contract.title}</p>
                      <span className={clsx('text-xs font-mono shrink-0', sc.color)}>{sc.label}</span>
                    </div>
                    <p className="text-xs text-ink-400 font-mono">
                      {contract.original_filename}
                      {contract.file_size_bytes && ` · ${(contract.file_size_bytes / 1024).toFixed(0)} KB`}
                      {contract.page_count && ` · ${contract.page_count} pages`}
                      {' · '}{new Date(contract.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleDelete(contract.id, contract.title)}
                      className="p-1.5 text-ink-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg 
                                 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                    {contract.status === 'complete' && (
                      <Link to={`/contracts/${contract.id}`}
                        className="flex items-center gap-1 text-sm text-gold-400 hover:text-gold-300 font-mono">
                        View <ChevronRight size={14} />
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
