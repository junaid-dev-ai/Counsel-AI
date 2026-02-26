// CounselAI – TypeScript Type Definitions

export type UserPlan = 'free' | 'pro' | 'enterprise'
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type AnalysisStatus = 'queued' | 'processing' | 'complete' | 'failed'
export type ClauseType =
  | 'liability' | 'indemnification' | 'termination' | 'ip_ownership'
  | 'confidentiality' | 'payment' | 'dispute' | 'governing_law'
  | 'non_compete' | 'force_majeure' | 'other'

export interface User {
  id:                   string
  email:                string
  full_name:            string
  plan:                 UserPlan
  is_verified:          boolean
  analyses_this_month:  number
  created_at:           string
}

export interface TokenResponse {
  access_token:  string
  refresh_token: string
  token_type:    string
}

export interface Contract {
  id:               string
  title:            string
  original_filename: string
  file_size_bytes:  number | null
  page_count:       number | null
  status:           AnalysisStatus
  error_message:    string | null
  created_at:       string
}

export interface ContractClause {
  id:            string
  clause_type:   ClauseType
  title:         string
  original_text: string
  explanation:   string
  risk_level:    RiskLevel
  risk_reasons:  string[] | null
  suggestions:   string[] | null
  is_standard:   boolean
}

export interface Recommendation {
  priority: RiskLevel
  title:    string
  detail:   string
}

export interface ContractAnalysis {
  id:                  string
  overall_risk:        RiskLevel | null
  risk_score:          number | null
  summary:             string | null
  contract_type:       string | null
  parties:             string[] | null
  governing_law:       string | null
  effective_date:      string | null
  expiry_date:         string | null
  key_obligations:     string[] | null
  recommendations:     Recommendation[] | null
  processing_time_sec: number | null
  clauses:             ContractClause[]
}

export interface ContractDetail extends Contract {
  analysis: ContractAnalysis | null
}

export interface DashboardStats {
  total_contracts:  number
  completed:        number
  critical_risk:    number
  high_risk:        number
  avg_risk_score:   number
  plan:             UserPlan
  analyses_used:    number
  analyses_limit:   number
}

export const RISK_COLORS: Record<RiskLevel, string> = {
  low:      '#22c55e',
  medium:   '#f59e0b',
  high:     '#ef4444',
  critical: '#7c3aed',
}

export const RISK_BG: Record<RiskLevel, string> = {
  low:      'bg-green-500/10 text-green-400 border-green-500/20',
  medium:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  high:     'bg-red-500/10 text-red-400 border-red-500/20',
  critical: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
}

export const CLAUSE_LABELS: Record<ClauseType, string> = {
  liability:        'Liability',
  indemnification:  'Indemnification',
  termination:      'Termination',
  ip_ownership:     'IP Ownership',
  confidentiality:  'Confidentiality',
  payment:          'Payment',
  dispute:          'Dispute Resolution',
  governing_law:    'Governing Law',
  non_compete:      'Non-Compete',
  force_majeure:    'Force Majeure',
  other:            'Other',
}
