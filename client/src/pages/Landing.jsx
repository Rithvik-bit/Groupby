import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, Calendar, ArrowRight, Check,
  ChevronDown, ChevronUp, Clock, ShieldCheck
} from 'lucide-react'

export default function Landing() {
  const [activeFaq, setActiveFaq] = useState(null)

  const toggleFaq = (idx) => {
    setActiveFaq(activeFaq === idx ? null : idx)
  }

  const examples = [
    {
      item: 'Sony FX3 Cinema Rig',
      retail: '₹3,80,000',
      split4: '₹95,000',
      split8: '₹47,500',
      timePerMonth: '7–8 days/month',
    },
    {
      item: 'Markforged Onyx Pro 3D Printer',
      retail: '₹6,50,000',
      split4: '₹1,62,500',
      split8: '₹81,250',
      timePerMonth: 'Shared build queue',
    },
    {
      item: 'Epilog 60W CO2 Laser Cutter',
      retail: '₹8,20,000',
      split4: '₹2,05,000',
      split8: '₹1,02,500',
      timePerMonth: 'Weekly slot rotation',
    },
  ]

  const faqs = [
    {
      q: "How does ownership calculation work?",
      a: "Ownership is tracked in basis points (10,000 bps = 100.00%). If four people split a ₹2,00,000 purchase equally, each person holds exactly 2,500 bps (25.00%). When someone contributes funds, their ownership percentage is calculated down to two decimal places with zero rounding error."
    },
    {
      q: "Why are amounts tracked in paise?",
      a: "Standard floating-point numbers in databases and JavaScript create rounding errors over time (e.g. 0.1 + 0.2 = 0.30000000000000004). GroupBuy stores all financial targets, ledger records, and member contributions as integer paise (1 INR = 100 paise). The UI formats these as rupees."
    },
    {
      q: "How do members share equipment without scheduling conflicts?",
      a: "Each group with shared assets has a booking calendar. Active co-owners select a start and end time. The system validates the slot against existing reservations before confirming, preventing double bookings."
    },
    {
      q: "Do I have to connect a real credit card or bank account?",
      a: "No. The platform currently runs in simulated payment mode. You can create groups, simulate contributions in paise, test ownership splits, and book equipment without spending real money."
    },
    {
      q: "What happens if someone leaves a group?",
      a: "A member can leave a group at any time. If an owner leaves, they can designate a successor from the existing member list, or ownership automatically transfers to the earliest active member."
    }
  ]

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <header className="border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold text-sm text-white">
            <div className="w-7 h-7 rounded bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
              GB
            </div>
            <span>GroupBuy</span>
          </Link>

          <nav className="hidden sm:flex items-center gap-6 text-xs text-zinc-400">
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#pricing-breakdown" className="hover:text-white transition-colors">Cost comparison</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-2.5">
            <Link to="/login" className="btn-secondary btn-sm text-xs">
              Log in
            </Link>
            <Link to="/register" className="btn-primary btn-sm text-xs">
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="pt-16 pb-14 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs font-mono uppercase tracking-wider text-indigo-400 mb-3">
            Collaborative equipment co-ownership
          </p>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white max-w-3xl mx-auto leading-tight">
            Split the cost of expensive equipment. Share the calendar.
          </h1>

          <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto mt-4 mb-8 leading-relaxed">
            Buy a 3D printer, camera rig, or workshop tools with a team. Everyone pays their portion, gets an exact equity record, and books time slots without scheduling conflicts.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link to="/register" className="btn-primary text-sm px-5 py-2.5">
              Create a group <ArrowRight size={15} />
            </Link>
            <Link to="/login" className="btn-secondary text-sm px-5 py-2.5">
              Explore demo account
            </Link>
          </div>

          <p className="text-xs text-zinc-500 mt-4">
            Runs with simulated funds. Zero real card details required.
          </p>
        </div>
      </section>

      {/* ── Live Interface Preview (Realistic, no slop) ──────────────────── */}
      <section className="py-12 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="mb-4 flex items-center justify-between text-xs text-zinc-400">
            <span className="font-medium text-zinc-300">Live platform sample</span>
            <span>Example group: Studio Gear Pool</span>
          </div>

          <div className="border rounded-lg overflow-hidden bg-zinc-950" style={{ borderColor: 'var(--border)' }}>
            {/* Header info */}
            <div className="p-4 sm:p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ borderColor: 'var(--border)' }}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="badge badge-success">Active Funding</span>
                  <span className="text-xs text-zinc-400">Category: Shared Equipment</span>
                </div>
                <h2 className="text-lg font-semibold text-white">Sony FX3 Cinema Kit + 24-70mm GM II</h2>
                <p className="text-xs text-zinc-400 mt-0.5">Four independent videographers pooling funds for shared weekend commercial shoots.</p>
              </div>

              <div className="sm:text-right">
                <div className="text-xl font-mono font-bold text-emerald-400">₹2,70,000</div>
                <div className="text-xs text-zinc-400">of ₹3,60,000 target (75% funded)</div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="px-5 pt-3">
              <div className="progress-track">
                <div className="progress-fill" style={{ width: '75%' }} />
              </div>
            </div>

            {/* Members table & schedule */}
            <div className="p-4 sm:p-5 grid md:grid-cols-2 gap-5">
              {/* Ownership Breakdown */}
              <div className="border rounded-md p-3.5 bg-zinc-900/60" style={{ borderColor: 'var(--border)' }}>
                <div className="text-xs font-semibold text-zinc-300 mb-2.5 flex items-center justify-between">
                  <span>Ownership Ledger</span>
                  <span className="text-zinc-500 font-mono text-[11px]">Exact Basis Points</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-zinc-800">
                    <span className="text-zinc-300">Aarav K. (Lead)</span>
                    <span className="font-mono text-zinc-200">₹90,000 · 2,500 bps (25%)</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-zinc-800">
                    <span className="text-zinc-300">Priya M.</span>
                    <span className="font-mono text-zinc-200">₹90,000 · 2,500 bps (25%)</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-zinc-800">
                    <span className="text-zinc-300">Studio 42</span>
                    <span className="font-mono text-zinc-200">₹90,000 · 2,500 bps (25%)</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 text-zinc-500">
                    <span>Slot 4 (Open)</span>
                    <span className="font-mono">₹90,000 remaining</span>
                  </div>
                </div>
              </div>

              {/* Booking schedule */}
              <div className="border rounded-md p-3.5 bg-zinc-900/60" style={{ borderColor: 'var(--border)' }}>
                <div className="text-xs font-semibold text-zinc-300 mb-2.5 flex items-center justify-between">
                  <span>Upcoming Equipment Bookings</span>
                  <span className="text-zinc-500 text-[11px]">Shared Calendar</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-2 rounded bg-zinc-800/60 border border-zinc-700/60">
                    <div className="flex justify-between font-medium text-zinc-200">
                      <span>Fri, Nov 6 · 09:00 – 18:00</span>
                      <span className="text-zinc-400">Studio 42</span>
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">Commercial brand shoot</div>
                  </div>

                  <div className="p-2 rounded bg-zinc-800/60 border border-zinc-700/60">
                    <div className="flex justify-between font-medium text-zinc-200">
                      <span>Sat–Sun, Nov 7–8</span>
                      <span className="text-zinc-400">Aarav K.</span>
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">Indie documentary weekend</div>
                  </div>

                  <div className="p-2 rounded border border-dashed border-zinc-700 text-center text-zinc-400">
                    <span>Mon, Nov 9 · Available for reservation</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-14 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-10">
            <h2 className="text-xl sm:text-2xl font-bold text-white">Three steps to co-own equipment</h2>
            <p className="text-sm text-zinc-400 mt-1">
              GroupBuy handles the accounting and the scheduling so you don't have to manage spreadsheets.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            <div className="border rounded-lg p-5 bg-zinc-900/40" style={{ borderColor: 'var(--border)' }}>
              <div className="text-xs font-mono font-bold text-indigo-400 mb-2">01</div>
              <h3 className="text-sm font-semibold text-white mb-1.5">Create your group</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Set a target funding amount in rupees and invite members. Choose between public discovery or private invite-only links.
              </p>
            </div>

            <div className="border rounded-lg p-5 bg-zinc-900/40" style={{ borderColor: 'var(--border)' }}>
              <div className="text-xs font-mono font-bold text-indigo-400 mb-2">02</div>
              <h3 className="text-sm font-semibold text-white mb-1.5">Collect contributions</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Members contribute their share. The ledger records every transaction in integer paise and issues exact basis point ownership tokens.
              </p>
            </div>

            <div className="border rounded-lg p-5 bg-zinc-900/40" style={{ borderColor: 'var(--border)' }}>
              <div className="text-xs font-mono font-bold text-indigo-400 mb-2">03</div>
              <h3 className="text-sm font-semibold text-white mb-1.5">Schedule usage</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Register the physical tool or equipment. Members book date and time slots on the shared calendar with automated conflict detection.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Cost Comparison Table ───────────────────────────────────────── */}
      <section id="pricing-breakdown" className="py-14 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white">Real cost comparison</h2>
            <p className="text-sm text-zinc-400 mt-1">
              Most tools sit idle 70% of the month. Here is what splitting looks like on common production equipment.
            </p>
          </div>

          <div className="border rounded-lg overflow-x-auto bg-zinc-950" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b text-zinc-400 bg-zinc-900/80" style={{ borderColor: 'var(--border)' }}>
                  <th className="py-3 px-4 font-medium">Equipment</th>
                  <th className="py-3 px-4 font-medium">Retail Price (Solo)</th>
                  <th className="py-3 px-4 font-medium">4-Person Co-Op</th>
                  <th className="py-3 px-4 font-medium">8-Person Co-Op</th>
                  <th className="py-3 px-4 font-medium">Typical Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {examples.map((ex, i) => (
                  <tr key={i} className="hover:bg-zinc-900/50">
                    <td className="py-3.5 px-4 font-medium text-white">{ex.item}</td>
                    <td className="py-3.5 px-4 text-zinc-400 line-through">{ex.retail}</td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-emerald-400">{ex.split4} each</td>
                    <td className="py-3.5 px-4 font-mono text-zinc-300">{ex.split8} each</td>
                    <td className="py-3.5 px-4 text-zinc-400">{ex.timePerMonth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-14 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white">Frequently asked questions</h2>
            <p className="text-sm text-zinc-400 mt-1">
              Direct answers about the mechanics, arithmetic precision, and scheduling rules.
            </p>
          </div>

          <div className="divide-y divide-zinc-800 border-y" style={{ borderColor: 'var(--border)' }}>
            {faqs.map((faq, idx) => (
              <div key={idx} className="py-4">
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between text-left text-sm font-medium text-zinc-200 hover:text-white"
                >
                  <span>{faq.q}</span>
                  {activeFaq === idx ? (
                    <ChevronUp size={16} className="text-zinc-400 shrink-0 ml-4" />
                  ) : (
                    <ChevronDown size={16} className="text-zinc-500 shrink-0 ml-4" />
                  )}
                </button>
                {activeFaq === idx && (
                  <p className="text-xs text-zinc-400 mt-2.5 leading-relaxed pr-8">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ──────────────────────────────────────────────────── */}
      <section className="py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">
            Start a group in under two minutes
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto mb-6">
            Test the workflow, simulate contributions, and schedule reservations in our demo sandbox.
          </p>
          <div className="flex justify-center gap-3">
            <Link to="/register" className="btn-primary text-sm px-5 py-2.5">
              Create an account
            </Link>
            <Link to="/login" className="btn-secondary text-sm px-5 py-2.5">
              Sign in with demo login
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="py-8 border-t text-xs text-zinc-500" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-300">GroupBuy</span>
            <span>·</span>
            <span>Integer Paise & Basis Points Architecture</span>
          </div>

          <div>
            Transactions in demo mode are simulated. No real money is collected.
          </div>
        </div>
      </footer>
    </div>
  )
}
