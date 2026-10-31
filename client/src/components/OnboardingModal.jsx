import { useState } from 'react'
import { Link } from 'react-router-dom'
import { X, ArrowRight, ShieldCheck } from 'lucide-react'

export default function OnboardingModal({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [dontShowAgain, setDontShowAgain] = useState(false)

  if (!isOpen) return null

  const handleDismiss = () => {
    if (dontShowAgain) {
      localStorage.setItem('groupbuy_hide_onboarding', 'true')
    }
    onClose()
  }

  const steps = [
    {
      title: "How GroupBuy works",
      content: (
        <div className="space-y-3 text-xs text-zinc-300">
          <p className="leading-relaxed">
            GroupBuy helps groups buy shared equipment and split time on a shared calendar without arguments over ownership or booking conflicts.
          </p>

          <div className="grid sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded border border-zinc-800 bg-zinc-900/60">
              <div className="font-semibold text-zinc-200 mb-1">Paise ledger</div>
              <p className="text-zinc-400">
                All money records are stored in integer paise (₹1 = 100 paise) so totals never drift due to rounding.
              </p>
            </div>

            <div className="p-3 rounded border border-zinc-800 bg-zinc-900/60">
              <div className="font-semibold text-zinc-200 mb-1">Basis points equity</div>
              <p className="text-zinc-400">
                Ownership sums to exactly 10,000 basis points (100.00%), clearly defining each member's share.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Quick start checklist",
      content: (
        <div className="space-y-2.5 text-xs">
          <div className="p-3 rounded border border-zinc-800 bg-zinc-900/60 flex items-center justify-between gap-3">
            <div>
              <div className="font-medium text-white">1. Browse open groups</div>
              <div className="text-zinc-400 text-[11px]">Check out current equipment pools or create your own.</div>
            </div>
            <Link to="/groups" onClick={handleDismiss} className="btn-secondary btn-sm text-[11px] py-1 px-2.5 shrink-0">
              Groups <ArrowRight size={12} />
            </Link>
          </div>

          <div className="p-3 rounded border border-zinc-800 bg-zinc-900/60 flex items-center justify-between gap-3">
            <div>
              <div className="font-medium text-white">2. Try a simulated contribution</div>
              <div className="text-zinc-400 text-[11px]">Simulate funding a group in rupees to see the live ledger update.</div>
            </div>
            <Link to="/groups" onClick={handleDismiss} className="btn-secondary btn-sm text-[11px] py-1 px-2.5 shrink-0">
              Contribute <ArrowRight size={12} />
            </Link>
          </div>

          <div className="p-3 rounded border border-zinc-800 bg-zinc-900/60 flex items-center justify-between gap-3">
            <div>
              <div className="font-medium text-white">3. Reserve equipment time</div>
              <div className="text-zinc-400 text-[11px]">Book time slots on shared assets with automated conflict checks.</div>
            </div>
            <Link to="/bookings" onClick={handleDismiss} className="btn-secondary btn-sm text-[11px] py-1 px-2.5 shrink-0">
              Bookings <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      )
    },
    {
      title: "Simulated sandbox",
      content: (
        <div className="space-y-3 text-xs text-zinc-300">
          <div className="p-3 rounded border border-zinc-800 bg-zinc-900/80 leading-relaxed text-zinc-400">
            All financial operations on this instance are simulated for demonstration. No real bank accounts or payment processors are charged.
          </div>
          <p className="text-zinc-400">
            You can re-open this guide at any time by clicking <strong>Guide</strong> in the navigation header.
          </p>
        </div>
      )
    }
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="w-full max-w-md rounded-lg p-5 relative border border-zinc-800 shadow-xl space-y-4"
        style={{ background: 'var(--bg-secondary)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h3 className="text-sm font-semibold text-white">
            {steps[currentStep].title}
          </h3>
          <button
            onClick={handleDismiss}
            className="p-1 rounded text-zinc-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Step Body */}
        <div className="min-h-[140px]">
          {steps[currentStep].content}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  currentStep === i ? 'w-4 bg-indigo-500' : 'bg-zinc-700'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="btn-secondary btn-sm text-xs py-1 px-3"
              >
                Back
              </button>
            )}

            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="btn-primary btn-sm text-xs py-1 px-3"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleDismiss}
                className="btn-primary btn-sm text-xs py-1 px-3"
              >
                Done
              </button>
            )}
          </div>
        </div>

        {/* Don't show again toggle */}
        <div className="pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-400 hover:text-zinc-300">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded bg-zinc-800 border-zinc-700 text-indigo-600 focus:ring-0"
            />
            <span>Don't show this walkthrough on login</span>
          </label>
        </div>
      </div>
    </div>
  )
}
