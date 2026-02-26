import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Scale, ArrowRight, CheckCircle, Zap, Shield, FileText, Star } from 'lucide-react'

const FEATURES = [
  {
    icon: Zap,
    title: 'Minutes, not hours',
    body:  'What takes a junior associate 3 hours takes CounselAI 30 seconds. Every clause, explained in plain English.',
  },
  {
    icon: Shield,
    title: 'Risk scored automatically',
    body:  'Every clause flagged with a risk level — critical, high, medium, or low — with specific reasons why.',
  },
  {
    icon: FileText,
    title: 'Actionable recommendations',
    body:  'Not just alerts — specific language suggestions and negotiation strategies for every risky clause.',
  },
]

const TESTIMONIALS = [
  { name: 'Sarah Chen', role: 'Startup Founder', quote: 'Saved $4,000 in legal fees on my first SaaS contract. The IP clause was a total trap I would have missed.' },
  { name: 'Marcus Webb', role: 'Freelance Developer', quote: 'I review every client contract before signing now. CounselAI caught a 24-month non-compete that would have destroyed my business.' },
  { name: 'Priya Sharma', role: 'VP Operations', quote: 'We review 50+ vendor contracts a month. CounselAI cut our legal review budget by 60% while improving our catch rate.' },
]

const stagger = {
  container: { animate: { transition: { staggerChildren: 0.1 } } },
  item: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  },
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-ink-900 text-ink-100 overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-ink-700/60 bg-ink-900/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-gold-500 rounded-lg flex items-center justify-center">
              <Scale size={14} className="text-ink-900" />
            </div>
            <span className="font-display text-xl font-semibold text-parchment-100 tracking-wide">
              Counsel<span className="text-gold-400">AI</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-ghost py-2 text-sm">Sign in</Link>
            <Link to="/register" className="btn-primary py-2 text-sm">Start free</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 relative">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] 
                          bg-gold-500/5 rounded-full blur-3xl" />
          <div className="absolute top-40 right-10 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gold-500/30 
                       bg-gold-500/8 text-gold-400 text-xs font-mono mb-6"
          >
            <Star size={11} className="fill-gold-400" />
            AI-powered · No legal background needed
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-5xl md:text-7xl font-bold text-parchment-50 leading-[1.05] mb-6"
          >
            Review contracts
            <br />
            <span className="text-gold-400 italic">like a senior partner.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-ink-300 max-w-2xl mx-auto mb-10 font-sans font-light leading-relaxed"
          >
            Upload any contract. Get a complete risk analysis, plain-English explanations,
            and specific negotiation recommendations — in under 60 seconds.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center gap-4 justify-center"
          >
            <Link to="/register" className="btn-primary px-8 py-3.5 text-base flex items-center gap-2 group">
              Analyze your first contract free
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <p className="text-xs text-ink-400 font-mono">No credit card · 3 free analyses/month</p>
          </motion.div>
        </div>

        {/* Mock interface preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="max-w-3xl mx-auto mt-16 relative"
        >
          <div className="card p-1 shadow-2xl shadow-ink-900">
            {/* Fake toolbar */}
            <div className="bg-ink-700 rounded-t-xl px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-amber-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
              </div>
              <div className="flex-1 bg-ink-600 rounded mx-4 h-5 text-xs font-mono text-ink-400 flex items-center px-2">
                counselai.app/contracts/analysis
              </div>
            </div>

            {/* Mock analysis UI */}
            <div className="p-5 grid grid-cols-3 gap-4">
              {/* Risk meter mock */}
              <div className="col-span-1 bg-ink-700/50 rounded-xl p-4 text-center">
                <div className="text-4xl font-display font-bold text-red-400 mb-1">72</div>
                <div className="text-xs text-red-400 font-mono uppercase tracking-wider">High Risk</div>
                <div className="mt-3 space-y-1.5">
                  {[['Critical', '2', 'text-violet-400'], ['High', '3', 'text-red-400'], ['Medium', '1', 'text-amber-400']].map(([l, n, c]) => (
                    <div key={l} className="flex justify-between text-xs">
                      <span className="text-ink-400">{l}</span>
                      <span className={`font-mono font-medium ${c}`}>{n}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clause list mock */}
              <div className="col-span-2 space-y-2">
                {[
                  { label: 'IP Ownership Assignment', risk: 'critical', color: 'border-violet-500/30 bg-violet-500/5' },
                  { label: 'Non-Compete (24 months)', risk: 'critical', color: 'border-violet-500/30 bg-violet-500/5' },
                  { label: 'Limitation of Liability',  risk: 'high',     color: 'border-red-500/30 bg-red-500/5' },
                  { label: 'Termination for Cause',    risk: 'medium',   color: 'border-amber-500/30 bg-amber-500/5' },
                  { label: 'Payment Terms (Net-30)',   risk: 'low',      color: 'border-green-500/30 bg-green-500/5' },
                ].map(item => (
                  <div key={item.label}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg border ${item.color}`}>
                    <span className="text-xs text-ink-200 font-sans">{item.label}</span>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-ink-400">{item.risk}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Glow effect */}
          <div className="absolute -inset-4 bg-gold-500/5 rounded-3xl blur-2xl -z-10" />
        </motion.div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 border-t border-ink-700/40">
        <div className="max-w-5xl mx-auto">
          <motion.div
            variants={stagger.container}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.variants={stagger.item}>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-parchment-100 mb-4">
                Everything a lawyer looks for,<br />automated.
              </h2>
              <p className="text-ink-400 font-sans max-w-xl mx-auto">
                CounselAI is trained on thousands of commercial contracts to catch what humans miss under deadline pressure.
              </p>
            </motion.variants>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="card p-6 hover:border-ink-500 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/20 
                                flex items-center justify-center mb-4">
                  <f.icon size={18} className="text-gold-400" />
                </div>
                <h3 className="font-display text-xl font-semibold text-parchment-100 mb-2">{f.title}</h3>
                <p className="text-sm text-ink-400 font-sans leading-relaxed">{f.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-20 px-6 bg-ink-800/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-parchment-100 text-center mb-12">
            Used by founders, freelancers, and ops teams
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="card p-6"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, s) => (
                    <Star key={s} size={13} className="fill-gold-400 text-gold-400" />
                  ))}
                </div>
                <p className="text-sm text-ink-300 font-sans leading-relaxed mb-4 italic">"{t.quote}"</p>
                <div>
                  <p className="text-sm font-sans font-medium text-parchment-100">{t.name}</p>
                  <p className="text-xs text-ink-400 font-mono">{t.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display text-4xl font-bold text-parchment-100 mb-3">Simple pricing</h2>
          <p className="text-ink-400 mb-12">Save thousands in legal fees from your first contract.</p>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'Free', price: '$0', analyses: '3/month', features: ['PDF & DOCX support', 'Clause detection', 'Risk scoring'], highlight: false },
              { name: 'Pro', price: '$49', analyses: '100/month', features: ['Everything in Free', 'Priority processing', 'Export PDF reports', 'Email support'], highlight: true },
              { name: 'Enterprise', price: 'Custom', analyses: 'Unlimited', features: ['Everything in Pro', 'API access', 'SSO & audit logs', 'Dedicated support'], highlight: false },
            ].map(plan => (
              <div key={plan.name}
                className={`card p-6 relative ${plan.highlight ? 'border-gold-500/50 shadow-lg shadow-gold-500/10' : ''}`}>
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gold-500 text-ink-900 text-xs font-mono font-bold rounded-full uppercase tracking-wider">
                    Most Popular
                  </div>
                )}
                <p className="text-sm text-ink-400 font-mono mb-1">{plan.name}</p>
                <div className="font-display text-4xl font-bold text-parchment-100 mb-1">{plan.price}</div>
                <p className="text-xs text-ink-400 mb-5">{plan.analyses}</p>
                <ul className="space-y-2.5 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-ink-300">
                      <CheckCircle size={14} className="text-green-400 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/register"
                  className={plan.highlight ? 'btn-primary w-full text-center block' : 'btn-ghost w-full text-center block'}>
                  Get started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 text-center border-t border-ink-700/40">
        <h2 className="font-display text-4xl md:text-5xl font-bold text-parchment-100 mb-4">
          The next contract you sign<br />
          <span className="text-gold-400 italic">could cost you everything.</span>
        </h2>
        <p className="text-ink-400 mb-8 max-w-md mx-auto">Or you could read it properly, in 60 seconds, for free.</p>
        <Link to="/register" className="btn-primary px-10 py-4 text-base inline-flex items-center gap-2 group">
          Analyze your first contract
          <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-ink-700/40 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Scale size={14} className="text-gold-400" />
            <span className="font-display text-base text-parchment-200">
              Counsel<span className="text-gold-400">AI</span>
            </span>
          </div>
          <p className="text-xs text-ink-500 font-mono">
            Not a law firm. For informational purposes only. Always consult a qualified attorney for legal advice.
          </p>
        </div>
      </footer>
    </div>
  )
}
