import { motion } from 'framer-motion'
import type { RiskLevel } from '../types'
import { RISK_BG, RISK_COLORS } from '../types'
import clsx from 'clsx'
import { Shield, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react'

const RISK_ICONS = {
  low:      ShieldCheck,
  medium:   Shield,
  high:     ShieldAlert,
  critical: ShieldX,
}

const RISK_LABELS = {
  low:      'Low Risk',
  medium:   'Medium Risk',
  high:     'High Risk',
  critical: 'Critical',
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span className={clsx('risk-badge', RISK_BG[level])}>
      {level}
    </span>
  )
}

export function RiskMeter({ score, level }: { score: number; level: RiskLevel }) {
  const Icon = RISK_ICONS[level]
  const color = RISK_COLORS[level]

  return (
    <div className="flex flex-col items-center">
      {/* Semicircular gauge */}
      <div className="relative w-40 h-20 mb-3">
        <svg viewBox="0 0 160 85" className="w-full h-full">
          {/* Track */}
          <path
            d="M 15 80 A 65 65 0 0 1 145 80"
            fill="none" stroke="#32323e" strokeWidth="10" strokeLinecap="round"
          />
          {/* Fill */}
          <motion.path
            d="M 15 80 A 65 65 0 0 1 145 80"
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray="204"
            initial={{ strokeDashoffset: 204 }}
            animate={{ strokeDashoffset: 204 - (204 * score / 100) }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
          />
          {/* Center text */}
          <text x="80" y="72" textAnchor="middle" fontSize="26"
            fill={color} fontFamily="Cormorant Garamond, serif" fontWeight="700">
            {Math.round(score)}
          </text>
        </svg>
      </div>
      <div className="flex items-center gap-2">
        <Icon size={16} style={{ color }} />
        <span className="font-display text-lg" style={{ color }}>
          {RISK_LABELS[level]}
        </span>
      </div>
    </div>
  )
}

export function RiskPill({ level, size = 'sm' }: { level: RiskLevel; size?: 'xs' | 'sm' | 'md' }) {
  const sizeClasses = {
    xs:  'text-[10px] px-1.5 py-0.5',
    sm:  'text-xs px-2.5 py-1',
    md:  'text-sm px-3 py-1.5',
  }
  return (
    <span className={clsx('inline-flex items-center font-mono font-medium rounded-full border uppercase tracking-wider', sizeClasses[size], RISK_BG[level])}>
      {level}
    </span>
  )
}
