import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { contractsApi } from '../lib/api'
import { RiskMeter, RiskPill } from '../components/RiskComponents'
import type { ContractClause, RiskLevel } from '../types'
import { CLAUSE_LABELS, RISK_COLORS } from '../types'
import {
  ArrowLeft, ChevronDown, ChevronUp, RotateCcw, Loader2,
  AlertCircle, CheckCircle2, Users, Gavel, Calendar,
  FileText, BookOpen, Lightbulb, ShieldAlert, Clock,
} from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'

const RISK_ORDER: RiskLevel[] = ['critical', 'high', 'medium', 'low']

function ClauseCard({ clause }: { clause: ContractClause }) {
  const [open, setOpen] = useState(clause.risk_level === 'critical')
  const color = RISK_COLORS[clause.risk_level]

  return (
    <motion.div
      layout
      className={clsx(
        'card overflow-hidden border-l-2 transition-all',
        clause.risk_level === 'critical' ? 'border-l-violet-500' :
        clause.risk_level === 'high'     ? 'border-l-red-500' :
        clause.risk_level === 'medium'   ? 'border-l-amber-500' : 'border-l-green-500'
      )}
    >
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-ink-700/30 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <RiskPill level={clause.risk_level} size="xs" />
            <span className="text-[11px] text-ink-500 font-mono uppercase tracking-wider">
              {CLAUSE_LABELS[clause.clause_type]}
            </span>
          </div>
          <p className="font-sans font-medium text-parchment-100 text-sm">{clause.title}</p>
        </div>
        {clause.is_standard
          ? <span className="text-[10px] font-mono text-green-400/70 bg-green-500/8 border border-green-500/15 px-2 py-0.5 rounded-full shrink-0">Standard</span>
          : <span className="text-[10px] font-mono text-amber-400/70 bg-amber-500/8 border border-amber-500/15 px-2 py-0.5 rounded-full shrink-0">Non-standard</span>
        }
        <div className="text-ink-500 shrink-0">
          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </div>
      </button>

      {/* Expanded */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              {/* Original text */}
              <div className="bg-ink-900/60 border border-ink-600 rounded-lg p-3">
                <p className="text-xs text-ink-500 font-mono uppercase tracking-wider mb-2">Contract Language</p>
                <p className="text-xs text-ink-300 font-mono leading-relaxed italic">{clause.original_text}</p>
              </div>

              {/* Plain-English explanation */}
              <div className="flex gap-2.5">
                <BookOpen size={14} className="text-sky-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-ink-500 font-mono uppercase tracking-wider mb-1">Plain English</p>
                  <p className="text-sm text-ink-200 leading-relaxed">{clause.explanation}</p>
                </div>
              </div>

              {/* Risk reasons */}
              {clause.risk_reasons && clause.risk_reasons.length > 0 && (
                <div className="flex gap-2.5">
                  <ShieldAlert size={14} style={{ color }} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-ink-500 font-mono uppercase tracking-wider mb-2">Why it's risky</p>
                    <ul className="space-y-1">
                      {clause.risk_reasons.map((r, i) => (
                        <li key={i} className="text-sm flex gap-2">
                          <span style={{ color }} className="mt-1.5 shrink-0">•</span>
                          <span className="text-ink-300">{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {clause.suggestions && clause.suggestions.length > 0 && (
                <div className="flex gap-2.5">
                  <Lightbulb size={14} className="text-gold-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-ink-500 font-mono uppercase tracking-wider mb-2">What to do</p>
                    <ul className="space-y-1">
                      {clause.suggestions.map((s, i) => (
                        <li key={i} className="text-sm flex gap-2">
                          <span className="text-gold-400 mt-1.5 shrink-0">→</span>
                          <span className="text-ink-200">{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function ContractPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<RiskLevel | 'all'>('all')
  const [reanalyzing, setReanalyzing] = useState(false)

  const { data: contract, isLoading, error, refetch } = useQuery({
    queryKey: ['contract', id],
    queryFn:  () => contractsApi.get(id!),
    refetchInterval: (data) => {
      if (data?.status === 'queued' || data?.status === 'processing') return 2000
      return false
    },
    enabled: !!id,
  })

  const handleReanalyze = async () => {
    setReanalyzing(true)
    try {
      await contractsApi.reanalyze(id!)
      toast.success('Reanalysis started')
      setTimeout(() => refetch(), 1000)
    } catch {
      toast.error('Reanalysis failed')
    } finally {
      setReanalyzing(false)
    }
  }

  // Loading
  if (isLoading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 size={28} className="text-gold-400 animate-spin" />
    </div>
  )

  // Error
  if (error || !contract) return (
    <div className="p-8 text-center">
      <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />
      <p className="text-parchment-100 font-display text-xl">Contract not found</p>
      <Link to="/dashboard" className="btn-ghost mt-4 inline-block">Back to Dashboard</Link>
    </div>
  )

  // Still processing
  if (contract.status === 'queued' || contract.status === 'processing') return (
    <div className="p-8 max-w-2xl mx-auto text-center">
      <div className="w-20 h-20 rounded-full bg-gold-500/10 border border-gold-500/20 
                      flex items-center justify-center mx-auto mb-6">
        <Loader2 size={32} className="text-gold-400 animate-spin" />
      </div>
      <h2 className="font-display text-2xl font-bold text-parchment-100 mb-2">Analyzing contract…</h2>
      <p className="text-ink-400 mb-2">Our AI is reviewing every clause. This usually takes 15–45 seconds.</p>
      <p className="text-xs text-ink-500 font-mono">Page will refresh automatically</p>
    </div>
  )

  // Failed
  if (contract.status === 'failed') return (
    <div className="p-8 max-w-lg mx-auto text-center">
      <AlertCircle size={40} className="text-red-400 mx-auto mb-4" />
      <h2 className="font-display text-2xl font-bold text-parchment-100 mb-2">Analysis failed</h2>
      <p className="text-ink-400 mb-2">{contract.error_message || 'An error occurred during analysis.'}</p>
      <div className="flex gap-3 justify-center mt-6">
        <Link to="/dashboard" className="btn-ghost">← Dashboard</Link>
        <button onClick={handleReanalyze} disabled={reanalyzing} className="btn-primary flex items-center gap-2">
          <RotateCcw size={14} className={reanalyzing ? 'animate-spin' : ''} />
          Try again
        </button>
      </div>
    </div>
  )

  const analysis = contract.analysis
  if (!analysis) return null

  const filteredClauses = filter === 'all'
    ? [...analysis.clauses].sort((a, b) => RISK_ORDER.indexOf(a.risk_level as RiskLevel) - RISK_ORDER.indexOf(b.risk_level as RiskLevel))
    : analysis.clauses.filter(c => c.risk_level === filter)

  const clauseCountByRisk = RISK_ORDER.reduce((acc, r) => {
    acc[r] = analysis.clauses.filter(c => c.risk_level === r).length
    return acc
  }, {} as Record<RiskLevel, number>)

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Link to="/dashboard" className="text-ink-400 hover:text-ink-200 flex items-center gap-1 text-sm transition-colors">
          <ArrowLeft size={14} />
          Dashboard
        </Link>
        <span className="text-ink-600">/</span>
        <span className="text-ink-300 text-sm truncate">{contract.title}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start gap-4 mb-8">
        <div className="flex-1">
          <h1 className="font-display text-3xl font-bold text-parchment-100 mb-1">{contract.title}</h1>
          <p className="text-sm text-ink-400 font-mono">{contract.original_filename}</p>
        </div>
        <button onClick={handleReanalyze} disabled={reanalyzing}
          className="btn-ghost text-sm flex items-center gap-2 shrink-0">
          <RotateCcw size={13} className={reanalyzing ? 'animate-spin' : ''} />
          Re-analyze
        </button>
      </div>

      {/* Top section: risk meter + meta */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {/* Risk gauge */}
        <div className="card p-6 flex flex-col items-center justify-center">
          <RiskMeter
            score={analysis.risk_score ?? 0}
            level={(analysis.overall_risk as RiskLevel) ?? 'low'}
          />
          <div className="grid grid-cols-4 gap-2 w-full mt-5">
            {RISK_ORDER.map(r => (
              <div key={r} className="text-center">
                <div className="font-display text-xl font-bold" style={{ color: RISK_COLORS[r] }}>
                  {clauseCountByRisk[r]}
                </div>
                <div className="text-[10px] text-ink-500 font-mono capitalize">{r}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Contract metadata */}
        <div className="md:col-span-2 card p-5 space-y-4">
          <h3 className="font-display text-lg font-semibold text-parchment-100 border-b border-ink-600 pb-3">Contract Details</h3>

          {[
            { icon: FileText, label: 'Type',           value: analysis.contract_type ?? '—' },
            { icon: Users,    label: 'Parties',         value: analysis.parties?.join(' · ') ?? '—' },
            { icon: Gavel,    label: 'Governing Law',   value: analysis.governing_law ?? '—' },
            { icon: Calendar, label: 'Effective Date',  value: analysis.effective_date ?? '—' },
            { icon: Clock,    label: 'Expiry Date',     value: analysis.expiry_date ?? '—' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-3">
              <Icon size={14} className="text-ink-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] text-ink-500 font-mono uppercase tracking-wider">{label}</p>
                <p className="text-sm text-ink-200 font-sans">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="card p-5 mb-6 border-l-2 border-l-gold-500">
        <p className="text-xs text-ink-500 font-mono uppercase tracking-wider mb-2">AI Summary</p>
        <p className="text-ink-200 leading-relaxed">{analysis.summary}</p>
      </div>

      {/* Recommendations */}
      {analysis.recommendations && analysis.recommendations.length > 0 && (
        <div className="card p-5 mb-6">
          <h3 className="font-display text-lg font-semibold text-parchment-100 mb-4">Priority Actions</h3>
          <div className="space-y-3">
            {analysis.recommendations.map((rec, i) => (
              <div key={i} className={clsx(
                'flex gap-3 p-3 rounded-lg border',
                rec.priority === 'critical' ? 'bg-violet-500/5 border-violet-500/20' :
                rec.priority === 'high'     ? 'bg-red-500/5 border-red-500/20' :
                rec.priority === 'medium'   ? 'bg-amber-500/5 border-amber-500/20' :
                                              'bg-green-500/5 border-green-500/20'
              )}>
                <RiskPill level={rec.priority as RiskLevel} size="xs" />
                <div>
                  <p className="text-sm font-sans font-medium text-parchment-100">{rec.title}</p>
                  <p className="text-xs text-ink-400 mt-0.5">{rec.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key obligations */}
      {analysis.key_obligations && analysis.key_obligations.length > 0 && (
        <div className="card p-5 mb-6">
          <h3 className="font-display text-lg font-semibold text-parchment-100 mb-4">Key Obligations</h3>
          <ul className="space-y-2">
            {analysis.key_obligations.map((ob, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-ink-300">
                <CheckCircle2 size={14} className="text-green-400 mt-0.5 shrink-0" />
                {ob}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Clause analysis */}
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="font-display text-xl font-semibold text-parchment-100">
            Clause Analysis <span className="text-ink-500 text-base">({analysis.clauses.length})</span>
          </h3>
          {/* Filter pills */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={clsx(
                'px-3 py-1 text-xs font-mono rounded-full border transition-all',
                filter === 'all'
                  ? 'bg-ink-600 border-ink-400 text-parchment-100'
                  : 'border-ink-600 text-ink-400 hover:border-ink-500'
              )}
            >
              All ({analysis.clauses.length})
            </button>
            {RISK_ORDER.map(r => clauseCountByRisk[r] > 0 && (
              <button
                key={r}
                onClick={() => setFilter(r)}
                className={clsx(
                  'px-3 py-1 text-xs font-mono rounded-full border transition-all capitalize',
                  filter === r
                    ? 'text-ink-900 border-transparent'
                    : 'border-ink-600 text-ink-400 hover:border-ink-500'
                )}
                style={filter === r ? { background: RISK_COLORS[r], borderColor: RISK_COLORS[r] } : {}}
              >
                {r} ({clauseCountByRisk[r]})
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filteredClauses.map((clause) => (
            <ClauseCard key={clause.id} clause={clause} />
          ))}
        </div>

        {filteredClauses.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-ink-400">No {filter} risk clauses found.</p>
          </div>
        )}
      </div>

      {/* Processing time */}
      {analysis.processing_time_sec && (
        <p className="text-xs text-ink-600 font-mono text-center mt-8">
          Analyzed in {analysis.processing_time_sec.toFixed(2)}s · Not legal advice — consult a qualified attorney
        </p>
      )}
    </div>
  )
}
