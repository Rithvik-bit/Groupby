import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles, X, CheckCircle2, Circle, ArrowRight,
  ShieldCheck, Coins, PieChart, Calendar, HelpCircle
} from 'lucide-react'

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
      title: "Welcome to GroupBuy Syndicates",
      badge: "Platform Overview",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            GroupBuy is engineered to let individuals and organizations co-own high-value assets with absolute mathematical precision and conflict-free resource sharing.
          </p>

          <div className="grid sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs mb-1">
                <Coins size={15} />
                <span>Zero Rounding Errors</span>
              </div>
              <p className="text-xs text-slate-400">
                All values are stored strictly in <strong>integer paise</strong> (₹1 = 100 paise) to prevent floating-point discrepancies.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs mb-1">
                <PieChart size={15} />
                <span>Basis Points Equity</span>
              </div>
              <p className="text-xs text-slate-400">
                Ownership shares sum to exactly <strong>10,000 basis points</strong> (100.00%), ensuring verifiable ownership rights.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Actionable 3-Step Quickstart",
      badge: "Interactive Guide",
      content: (
        <div className="space-y-3">
          <p className="text-xs text-slate-300">
            Follow these three milestones to master the collaborative workflow:
          </p>

          <div className="space-y-2.5">
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Discover & Join a Syndicate</div>
                  <div className="text-[11px] text-slate-400">
                    Browse public groups or create your own with custom funding targets.
                  </div>
                </div>
              </div>
              <Link to="/groups" onClick={handleDismiss} className="btn-secondary btn-sm text-[11px] py-1 px-2.5 shrink-0">
                Browse <ArrowRight size={12} />
              </Link>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Simulate a Contribution</div>
                  <div className="text-[11px] text-slate-400">
                    Test the simulated wallet with zero financial risk and watch your equity mint in real-time.
                  </div>
                </div>
              </div>
              <Link to="/groups" onClick={handleDismiss} className="btn-secondary btn-sm text-[11px] py-1 px-2.5 shrink-0">
                Try Out <ArrowRight size={12} />
              </Link>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Book Shared Equipment Slots</div>
                  <div className="text-[11px] text-slate-400">
                    Reserve shared assets conflict-free on the unified reservation calendar.
                  </div>
                </div>
              </div>
              <Link to="/bookings" onClick={handleDismiss} className="btn-secondary btn-sm text-[11px] py-1 px-2.5 shrink-0">
                Calendar <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Real-Time Collaboration",
      badge: "Features",
      content: (
        <div className="space-y-3.5 text-xs text-slate-300">
          <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-900/40 space-y-2">
            <div className="flex items-center gap-2 text-indigo-300 font-semibold text-sm">
              <ShieldCheck size={16} />
              <span>Safety & Governance Safeguards</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Every group contains an authenticated Socket.IO chat room, an immutable audit log of all contributions and administrative actions, and automatic email notifications.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 flex items-center justify-between">
            <span>Need this guide again? Click the <strong>Help (?)</strong> icon in the header anytime.</span>
          </div>
        </div>
      )
    }
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-lg rounded-2xl p-6 relative border border-indigo-500/30 shadow-2xl space-y-5"
        style={{ background: 'var(--bg-secondary)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b pb-3.5" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Sparkles size={16} />
            </div>
            <div>
              <span className="badge badge-primary text-[10px] uppercase font-bold tracking-wider py-0.5">
                {steps[currentStep].badge}
              </span>
              <h3 className="text-base font-bold text-white mt-0.5">
                {steps[currentStep].title}
              </h3>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step Body */}
        <div className="min-h-[190px]">
          {steps[currentStep].content}
        </div>

        {/* Step indicator dots & Navigation */}
        <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  currentStep === i ? 'w-6 bg-indigo-500' : 'bg-slate-700 hover:bg-slate-600'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="btn-secondary btn-sm text-xs py-1.5 px-3"
              >
                Back
              </button>
            )}

            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="btn-primary btn-sm text-xs py-1.5 px-3"
              >
                Next <ArrowRight size={13} />
              </button>
            ) : (
              <button
                onClick={handleDismiss}
                className="btn-primary btn-sm text-xs py-1.5 px-3"
              >
                Got it, Let's Go!
              </button>
            )}
          </div>
        </div>

        {/* Don't show again toggle */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 hover:text-slate-300">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
            />
            <span>Don't show this walkthrough automatically on login</span>
          </label>
        </div>
      </div>
    </div>
  )
}

