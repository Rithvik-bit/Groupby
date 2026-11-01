import { useState } from 'react'
import { Link } from 'react-router-dom'
import GhostFibers from '../components/GhostFibers'
import SpotlightCard from '../components/SpotlightCard'
import AnimatedCounter from '../components/AnimatedCounter'
import Logo from '../components/Logo'
import {
  Users, Calendar, ArrowRight, Check,
  ChevronDown, ChevronUp, Clock, ShieldCheck,
  CheckCircle2, Sparkles, Layers, RefreshCw
} from 'lucide-react'

export default function Landing() {
  const [activeFaq, setActiveFaq] = useState(null)
  const [activeTab, setActiveTab] = useState('camera')

  const toggleFaq = (idx) => {
    setActiveFaq(activeFaq === idx ? null : idx)
  }

  const equipmentTabs = {
    camera: {
      title: 'Sony FX3 Cinema Kit + 24-70mm GM II',
      tag: 'Shared Equipment',
      description: 'Four independent videographers pooling funds for shared commercial shoot calendar.',
      funded: 270000,
      target: 360000,
      fundedPct: 75,
      members: [
        { name: 'Aarav K. (Lead)', amount: '₹90,000', bps: '2,500 bps (25.00%)' },
        { name: 'Priya M.', amount: '₹90,000', bps: '2,500 bps (25.00%)' },
        { name: 'Studio 42', amount: '₹90,000', bps: '2,500 bps (25.00%)' },
        { name: 'Slot 4 (Open)', amount: '₹90,000 remaining', bps: '2,500 bps pending', open: true }
      ],
      upcoming: [
        { time: 'Fri, Nov 6 · 09:00 – 18:00', who: 'Studio 42', desc: 'Commercial brand shoot' },
        { time: 'Sat–Sun, Nov 7–8', who: 'Aarav K.', desc: 'Indie documentary weekend' }
      ]
    },
    printer: {
      title: 'Markforged Onyx Pro 3D Printer',
      tag: 'Collective Purchase',
      description: 'Hardware prototyping collective sharing continuous fiber fabrication queue.',
      funded: 487500,
      target: 650000,
      fundedPct: 75,
      members: [
        { name: 'Rohan V.', amount: '₹1,62,500', bps: '2,500 bps (25.00%)' },
        { name: 'DevCraft Labs', amount: '₹1,62,500', bps: '2,500 bps (25.00%)' },
        { name: 'Ananya S.', amount: '₹1,62,500', bps: '2,500 bps (25.00%)' },
        { name: 'Slot 4 (Open)', amount: '₹1,62,500 remaining', bps: '2,500 bps pending', open: true }
      ],
      upcoming: [
        { time: 'Thu–Fri, Nov 5–6', who: 'DevCraft Labs', desc: 'Carbon nylon chassis batch' },
        { time: 'Mon, Nov 9 · 10:00 – 17:00', who: 'Rohan V.', desc: 'Robotics bracket tooling' }
      ]
    }
  }

  const activeEquipment = equipmentTabs[activeTab] || equipmentTabs.camera

  const examples = [
    {
      item: 'Sony FX3 Cinema Rig',
      retail: 380000,
      split4: 95000,
      split8: 47500,
      timePerMonth: '7–8 days/month',
    },
    {
      item: 'Markforged Onyx Pro 3D Printer',
      retail: 650000,
      split4: 162500,
      split8: 81250,
      timePerMonth: 'Shared build queue',
    },
    {
      item: 'Epilog 60W CO2 Laser Cutter',
      retail: 820000,
      split4: 205000,
      split8: 102500,
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
      {/* ── Navigation (Sticky with backdrop-blur) ───────────────────────── */}
      <header className="sticky top-0 z-40 border-b backdrop-blur-md bg-zinc-950/80 transition-all" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Logo variant="full" size="sm" to="/" />

          <nav className="hidden sm:flex items-center gap-6 text-xs text-zinc-400">
            <a href="#live-preview" className="hover:text-white transition-colors">Live Bento</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">Workflow</a>
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

      {/* ── Hero Section with React Bits Canvas Backdrop ────────────────── */}
      <section className="relative pt-20 pb-20 border-b overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        {/* GhostFibers WebGL Canvas Background */}
        <div className="absolute inset-0 w-full h-full opacity-40 pointer-events-auto">
          <GhostFibers
            glowColor="#4f46e5"
            secondaryColor="#06b6d4"
            lineColor="#e0e7ff"
            layers={3}
            twist={0.8}
            threads={64}
            fiberStyle="dots"
            depthOfField={0.8}
            hoverEffect="focus"
            intro={true}
            mouseInteraction={true}
            pulseOnClick={true}
            waves={1.4}
            volume={0.22}
            rotation={20}
            density={0.85}
            foldGlow={1.6}
            speed={0.4}
            scale={1.05}
          />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center pointer-events-none">
          {/* Status Badge chip */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium text-indigo-300 bg-indigo-950/70 border border-indigo-500/30 mb-5 shadow-lg shadow-indigo-950/50 backdrop-blur-sm pointer-events-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Exact basis points equity · Integer paise precision</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white max-w-3xl mx-auto leading-tight">
            Buy Together. Own Together. <br className="hidden sm:inline" />
            <span style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Grow Together.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-zinc-300 max-w-2xl mx-auto mt-4 mb-8 leading-relaxed">
            Collectively acquire expensive assets, share audited fractional ownership in basis points, coordinate usage on conflict-free booking calendars, communicate privately, and manage equity transfers seamlessly.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pointer-events-auto">
            <Link to="/register" className="btn-primary text-sm px-5 py-2.5 shadow-md shadow-indigo-500/20">
              Create a group <ArrowRight size={15} />
            </Link>
            <Link to="/login" className="btn-secondary text-sm px-5 py-2.5">
              Explore demo sandbox
            </Link>
          </div>

          <p className="text-xs text-zinc-400 mt-4">
            Runs with simulated funds. Zero real card details required.
          </p>
        </div>
      </section>

      {/* ── React Bits Inspired Bento Grid Live Preview ───────────────────── */}
      <section id="live-preview" className="py-16 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-mono text-indigo-400 uppercase tracking-wider mb-1">Interactive Interface Preview</p>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">How co-ownership runs in practice</h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xl">
                Explore a live demo asset. Notice the exact basis point equity distribution, integer paise funding ledger, and real-time reservation slots.
              </p>
            </div>

            {/* Pill Switcher */}
            <div className="flex items-center p-1 rounded-lg bg-zinc-900 border border-zinc-800 self-start sm:self-auto">
              <button
                onClick={() => setActiveTab('camera')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'camera' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
              >
                Cinema Gear
              </button>
              <button
                onClick={() => setActiveTab('printer')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'printer' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
              >
                3D Fabrication
              </button>
            </div>
          </div>

          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Bento Card 1: Asset Header & Progress (Span 2 cols on desktop) */}
            <SpotlightCard className="md:col-span-2 flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="badge badge-success flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active Funding
                    </span>
                    <span className="text-xs text-zinc-400">{activeEquipment.tag}</span>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-700/60">
                    Target: ₹{(activeEquipment.target / 100).toLocaleString('en-IN')}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-white tracking-tight">{activeEquipment.title}</h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-xl">{activeEquipment.description}</p>
              </div>

              <div className="mt-6 pt-5 border-t border-zinc-800/80">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-xs text-zinc-400">Total Pooled Capital</span>
                  <div className="text-right">
                    <span className="text-2xl font-bold font-mono text-emerald-400">
                      ₹<AnimatedCounter value={activeEquipment.funded} />
                    </span>
                    <span className="text-xs text-zinc-400 ml-1.5 font-mono">
                      ({activeEquipment.fundedPct}% funded)
                    </span>
                  </div>
                </div>

                {/* Animated Progress Bar */}
                <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${activeEquipment.fundedPct}%` }}
                  />
                </div>
              </div>
            </SpotlightCard>

            {/* Bento Card 2: Precision Metric Highlight (Span 1 col) */}
            <SpotlightCard className="flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
                  <ShieldCheck size={18} />
                </div>
                <h4 className="text-sm font-semibold text-white">Mathematical Invariant</h4>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Every split guarantees exactly 10,000 basis points sum. Contributed paise convert directly to immutable equity units.
                </p>
              </div>

              <div className="mt-4 p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80 font-mono text-xs space-y-1.5">
                <div className="flex justify-between text-zinc-400">
                  <span>Unit Scale:</span>
                  <span className="text-indigo-400">10,000 bps = 100%</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Cur. Precision:</span>
                  <span className="text-emerald-400">Integer Paise (₹ × 100)</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Rounding Error:</span>
                  <span className="text-zinc-200">0.00%</span>
                </div>
              </div>
            </SpotlightCard>

            {/* Bento Card 3: Ownership Ledger (Span 1.5 or 1 col) */}
            <SpotlightCard className="md:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Layers size={15} className="text-indigo-400" />
                  <span className="text-xs font-semibold text-zinc-200">Equity Breakdown Ledger</span>
                </div>
                <span className="text-[11px] font-mono text-zinc-500">Auto-allocated</span>
              </div>

              <div className="space-y-2 text-xs">
                {activeEquipment.members.map((member, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between py-2 px-2.5 rounded-lg border transition-colors ${
                      member.open
                        ? 'border-dashed border-zinc-700 bg-zinc-950/40 text-zinc-400'
                        : 'border-zinc-800/80 bg-zinc-900/40 text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-mono text-zinc-400">
                        0{idx + 1}
                      </span>
                      <span className="font-medium">{member.name}</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-right">
                      <span className={member.open ? 'text-zinc-500' : 'text-zinc-300'}>{member.amount}</span>
                      <span className={`text-[11px] px-1.5 py-0.5 rounded ${member.open ? 'bg-zinc-800 text-zinc-500' : 'bg-indigo-950/60 text-indigo-400 border border-indigo-800/40'}`}>
                        {member.bps}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </SpotlightCard>

            {/* Bento Card 4: Shared Calendar Schedule */}
            <SpotlightCard className="md:col-span-1">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar size={15} className="text-emerald-400" />
                  <span className="text-xs font-semibold text-zinc-200">Upcoming Reservations</span>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  No conflicts
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                {activeEquipment.upcoming.map((slot, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800">
                    <div className="flex items-center justify-between text-zinc-200 font-medium">
                      <span>{slot.time}</span>
                      <span className="text-indigo-400 text-[11px]">{slot.who}</span>
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1.5">
                      <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                      <span>{slot.desc}</span>
                    </div>
                  </div>
                ))}

                <div className="p-2 rounded-lg border border-dashed border-zinc-700/80 text-center text-zinc-400 text-[11px]">
                  Next available slot opens Monday 09:00
                </div>
              </div>
            </SpotlightCard>
          </div>
        </div>
      </section>

      {/* ── How It Works (Tactile Spotlight Cards) ───────────────────────── */}
      <section id="how-it-works" className="py-16 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-mono text-indigo-400 uppercase tracking-wider mb-1">Simple Workflow</p>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Three steps to co-own equipment</h2>
            <p className="text-sm text-zinc-400 mt-1">
              GroupBuy handles the accounting and the scheduling so you don't have to manage spreadsheets or dispute usage.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            <SpotlightCard>
              <div className="text-xs font-mono font-bold text-indigo-400 mb-3 px-2 py-1 bg-indigo-500/10 rounded w-fit border border-indigo-500/20">
                STEP 01
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">Create your group</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Set a target funding amount in rupees and invite members. Choose between public discovery or private invite-only links.
              </p>
            </SpotlightCard>

            <SpotlightCard>
              <div className="text-xs font-mono font-bold text-indigo-400 mb-3 px-2 py-1 bg-indigo-500/10 rounded w-fit border border-indigo-500/20">
                STEP 02
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">Collect contributions</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Members contribute their share. The ledger records every transaction in integer paise and issues exact basis point ownership tokens.
              </p>
            </SpotlightCard>

            <SpotlightCard>
              <div className="text-xs font-mono font-bold text-indigo-400 mb-3 px-2 py-1 bg-indigo-500/10 rounded w-fit border border-indigo-500/20">
                STEP 03
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">Schedule usage</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Register the physical tool or equipment. Members book date and time slots on the shared calendar with automated conflict detection.
              </p>
            </SpotlightCard>
          </div>
        </div>
      </section>

      {/* ── Cost Comparison Table with Animated Counters ──────────────────── */}
      <section id="pricing-breakdown" className="py-16 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-8">
            <p className="text-xs font-mono text-indigo-400 uppercase tracking-wider mb-1">Financial Efficiency</p>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Real equipment cost comparison</h2>
            <p className="text-sm text-zinc-400 mt-1">
              Most tools sit idle 70% of the month. Here is what splitting looks like on common production equipment.
            </p>
          </div>

          <div className="border rounded-xl overflow-x-auto bg-zinc-950 border-zinc-800 shadow-xl">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b text-zinc-400 bg-zinc-900/90 border-zinc-800">
                  <th className="py-3.5 px-4 font-medium">Equipment</th>
                  <th className="py-3.5 px-4 font-medium">Retail Price (Solo)</th>
                  <th className="py-3.5 px-4 font-medium">4-Person Co-Op</th>
                  <th className="py-3.5 px-4 font-medium">8-Person Co-Op</th>
                  <th className="py-3.5 px-4 font-medium">Typical Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {examples.map((ex, i) => (
                  <tr key={i} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="py-4 px-4 font-medium text-white">{ex.item}</td>
                    <td className="py-4 px-4 text-zinc-500 line-through">
                      ₹<AnimatedCounter value={ex.retail} />
                    </td>
                    <td className="py-4 px-4 font-mono font-semibold text-emerald-400">
                      ₹<AnimatedCounter value={ex.split4} /> each
                    </td>
                    <td className="py-4 px-4 font-mono text-zinc-300">
                      ₹<AnimatedCounter value={ex.split8} /> each
                    </td>
                    <td className="py-4 px-4 text-zinc-400">{ex.timePerMonth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-16 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="mb-10">
            <p className="text-xs font-mono text-indigo-400 uppercase tracking-wider mb-1">Architecture Details</p>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Frequently asked questions</h2>
            <p className="text-sm text-zinc-400 mt-1">
              Direct answers about the mechanics, arithmetic precision, and scheduling rules.
            </p>
          </div>

          <div className="divide-y divide-zinc-800 border-y border-zinc-800">
            {faqs.map((faq, idx) => (
              <div key={idx} className="py-4">
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between text-left text-sm font-medium text-zinc-200 hover:text-white transition-colors"
                >
                  <span>{faq.q}</span>
                  {activeFaq === idx ? (
                    <ChevronUp size={16} className="text-zinc-400 shrink-0 ml-4" />
                  ) : (
                    <ChevronDown size={16} className="text-zinc-500 shrink-0 ml-4" />
                  )}
                </button>
                {activeFaq === idx && (
                  <p className="text-xs text-zinc-400 mt-3 leading-relaxed pr-8 animate-fadeIn">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ──────────────────────────────────────────────────── */}
      <section className="py-20 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <SpotlightCard className="text-center py-12 px-6 sm:px-12 bg-gradient-to-b from-zinc-900/80 to-zinc-950/90 border-zinc-800">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 tracking-tight">
              Start a co-ownership group in under two minutes
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto mb-8 leading-relaxed">
              Test the workflow, simulate contributions, and schedule reservations in our demo sandbox.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/register" className="btn-primary text-sm px-6 py-2.5">
                Create an account
              </Link>
              <Link to="/login" className="btn-secondary text-sm px-6 py-2.5">
                Sign in with demo login
              </Link>
            </div>
          </SpotlightCard>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="py-12 border-t text-xs text-zinc-400" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-zinc-800/80">
            <div>
              <Logo variant="full" size="md" to="/" className="mb-2" />
              <p className="text-xs text-zinc-400 max-w-sm mt-2">
                A collaborative ownership platform to collectively acquire expensive assets, manage shared equipment, coordinate usage, and track joint ventures.
              </p>
            </div>
            <div className="flex flex-wrap gap-8 text-xs">
              <div className="space-y-2">
                <div className="font-semibold text-zinc-200">Platform</div>
                <div><a href="#live-preview" className="hover:text-white transition-colors">Live Bento</a></div>
                <div><a href="#how-it-works" className="hover:text-white transition-colors">Workflow</a></div>
                <div><a href="#faq" className="hover:text-white transition-colors">FAQ</a></div>
              </div>
              <div className="space-y-2">
                <div className="font-semibold text-zinc-200">Legal &amp; Trust</div>
                <div><a href="#about" className="hover:text-white transition-colors">About</a></div>
                <div><a href="#privacy" className="hover:text-white transition-colors">Privacy</a></div>
                <div><a href="#terms" className="hover:text-white transition-colors">Terms</a></div>
                <div><a href="#security" className="hover:text-white transition-colors">Security</a></div>
                <div><a href="#help" className="hover:text-white transition-colors">Help</a></div>
              </div>
            </div>
          </div>
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-zinc-500">
            <div>© {new Date().getFullYear()} GroupBuy. Buy Together. Own Together. Grow Together.</div>
            <div>All financial operations in demo sandbox are simulated with integer paise.</div>
          </div>
        </div>
      </footer>
    </div>
  )
}
