import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import { contractsApi } from '../lib/api'
import { useStore } from '../lib/store'
import { X, Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import clsx from 'clsx'

type Stage = 'idle' | 'uploading' | 'success' | 'error'

export default function UploadModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addContract } = useStore()
  const navigate = useNavigate()
  const [stage, setStage]     = useState<Stage>('idle')
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [contractId, setContractId] = useState('')

  const reset = () => {
    setStage('idle'); setProgress(0); setErrorMsg(''); setContractId('')
  }

  const handleClose = () => {
    if (stage === 'uploading') return
    reset(); onClose()
  }

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0]
    if (!file) return
    setStage('uploading'); setProgress(0); setErrorMsg('')
    try {
      const contract = await contractsApi.upload(file, pct => setProgress(pct))
      addContract(contract)
      setContractId(contract.id)
      setStage('success')
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail ?? 'Upload failed. Please try again.')
      setStage('error')
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
    disabled: stage === 'uploading',
  })

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-ink-900/80 backdrop-blur-sm z-40"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div className="bg-ink-800 border border-ink-600 rounded-2xl w-full max-w-lg shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-ink-600">
                <div>
                  <h2 className="font-display text-xl font-semibold text-parchment-100">
                    Analyze Contract
                  </h2>
                  <p className="text-xs text-ink-400 font-mono mt-0.5">PDF, DOCX, or TXT — max 50MB</p>
                </div>
                <button onClick={handleClose} disabled={stage === 'uploading'}
                  className="p-2 text-ink-400 hover:text-ink-200 hover:bg-ink-700 rounded-lg transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="p-6">
                {/* Idle / Drop zone */}
                {(stage === 'idle' || stage === 'uploading') && (
                  <div
                    {...getRootProps()}
                    className={clsx(
                      'relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200',
                      isDragActive
                        ? 'border-gold-500 bg-gold-500/5'
                        : stage === 'uploading'
                        ? 'border-ink-500 bg-ink-700/30 cursor-not-allowed'
                        : 'border-ink-500 hover:border-gold-500/50 hover:bg-ink-700/30'
                    )}
                  >
                    <input {...getInputProps()} />

                    {stage === 'uploading' ? (
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 size={36} className="text-gold-500 animate-spin" />
                        <div className="w-full max-w-xs">
                          <div className="flex justify-between text-xs font-mono text-ink-400 mb-2">
                            <span>Uploading…</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="h-1.5 bg-ink-600 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-gold-500 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              transition={{ ease: 'easeOut' }}
                            />
                          </div>
                          <p className="text-xs text-ink-400 mt-2">AI analysis will begin automatically…</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-14 h-14 rounded-2xl bg-ink-700 border border-ink-500 flex items-center justify-center mx-auto mb-4">
                          <Upload size={22} className={isDragActive ? 'text-gold-400' : 'text-ink-300'} />
                        </div>
                        <p className="font-display text-lg text-parchment-200 mb-1">
                          {isDragActive ? 'Drop it here' : 'Drop your contract here'}
                        </p>
                        <p className="text-sm text-ink-400">or <span className="text-gold-400 underline underline-offset-2">browse files</span></p>
                        <div className="flex items-center gap-2 justify-center mt-4">
                          {['PDF', 'DOCX', 'TXT'].map(fmt => (
                            <span key={fmt} className="px-2 py-0.5 bg-ink-700 border border-ink-500 rounded text-xs font-mono text-ink-300">
                              {fmt}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Success */}
                {stage === 'success' && (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 size={30} className="text-green-400" />
                    </div>
                    <h3 className="font-display text-xl text-parchment-100 mb-1">Contract Uploaded</h3>
                    <p className="text-sm text-ink-400 mb-6">AI analysis is running in the background. Usually takes 15–30 seconds.</p>
                    <div className="flex gap-3">
                      <button onClick={handleClose} className="btn-ghost flex-1">
                        Upload Another
                      </button>
                      <button
                        onClick={() => { handleClose(); navigate(`/contracts/${contractId}`) }}
                        className="btn-primary flex-1"
                      >
                        View Results
                      </button>
                    </div>
                  </div>
                )}

                {/* Error */}
                {stage === 'error' && (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
                      <AlertCircle size={30} className="text-red-400" />
                    </div>
                    <h3 className="font-display text-xl text-parchment-100 mb-1">Upload Failed</h3>
                    <p className="text-sm text-ink-400 mb-6">{errorMsg}</p>
                    <div className="flex gap-3">
                      <button onClick={handleClose} className="btn-ghost flex-1">Close</button>
                      <button onClick={reset} className="btn-primary flex-1">Try Again</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
