import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, ShieldCheck, Calendar, ArrowRight, CheckCircle2,
  Sparkles, Layers, DollarSign, TrendingUp, HelpCircle,
  ChevronDown, ChevronUp, Lock, RefreshCw, Box, Award,
  Sliders, ArrowUpRight
} from 'lucide-react'

export default function Landing() {
  // Interactive Calculator state
  const [assetPrice, setAssetPrice] = useState(250000) // ₹2,50,000
  const [memberCount, setMemberCount] = useState(5)
  const [activeFaq, setActiveFaq] = useState(null)

  const costPerMember = Math.round(assetPrice / memberCount)
  const savingsPercent = Math.round(((assetPrice - costPerMember) / assetPrice) * 100)
  const basisPointsPerMember = Math.round(10000 / memberCount)

  const toggleFaq = (idx) => {
    setActiveFaq(activeFaq === idx ? null : idx)
  }

  const faqs = [
    {
      q: "How does GroupBuy calculate fractional ownership?",
      a: "Ownership percentages are strictly tracked in integer basis points (10,000 bps = 100.00%, 1 bps = 0.01%). When group members contribute funds towards a target asset, their equity share is mathematically calculated in basis points, ensuring zero floating-point drift and a clean 100% total allocation."
    },
    {
      q: "Why are all financial transactions tracked in paise?",
      a: "To eliminate IEEE 754 floating-point rounding errors common in financial web applications, all ledger entries, targets, and contributions are strictly processed and stored as integer paise (1 INR = 100 paise). The frontend formats these into clean rupee amounts for display."
    },
    {
      q: "Is real money required to test the platform?",
      a: "No! GroupBuy includes a zero-risk SimulatedPaymentProvider with an integrated simulated wallet. You can create groups, simulate contributions, transfer ownership tokens, and test resource reservations without connecting real bank accounts or spending real money."
    },
    {
      q: "How do shared asset reservations work?",
      a: "Groups can register co-owned physical assets (e.g. 3D printers, CNC mills, commercial equipment). Co-owners can book exclusive usage time slots via a shared calendar with automated conflict prevention and concurrency checks."
    },
    {
      q: "What types of syndicates can be created?",
      a: "GroupBuy supports three purpose-built group types: 'Collective Purchase' (for pooling funds to acquire bulk supplies or single high-value items), 'Shared Equipment' (for fractional co-ownership and timeshare scheduling), and 'Business Venture' (for micro-cooperatives and revenue-generating joint assets)."
    }
  ]

  return (
    <div className="min-h-screen text-slate-100 selection:bg-indigo-500/30 selection:text-white" style={{ background: 'var(--bg-primary)' }}>
      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 backdrop-blur-md border-b" style={{ borderColor: 'var(--border)', background: 'rgba(10, 10, 15, 0.8)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-white hover:opacity-90 transition-opacity">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20"
              style={{ background: 'var(--gradient-primary)' }}>
              <Users size={18} className="text-white" />
            </div>
            <span>Group<span className="text-indigo-400">Buy</span></span>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#calculator" className="hover:text-white transition-colors">Savings Calculator</a>
            <a href="#use-cases" className="hover:text-white transition-colors">Use Cases</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-secondary btn-sm">
              Sign In
            </Link>
            <Link to="/register" className="btn-primary btn-sm">
              Get Started <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero Section ────────────────────────────────────────────────── */}
      <section className="relative pt-20 pb-24 overflow-hidden">
        {/* Glow backdrop effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 -translate-x-1/2 w-[400px] h-[250px] bg-purple-600/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Tag Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-6 animate-fade-in"
            style={{ background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.25)', color: '#a5b4fc' }}>
            <Sparkles size={13} className="text-indigo-400" />
            <span>Fractional Co-Ownership & Resource Sharing</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight sm:leading-tight mb-6">
            Own high-value assets and equipment <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-400 bg-clip-text text-transparent">together.</span>
          </h1>

          <p className="text-base sm:text-lg max-w-2xl mx-auto mb-9 font-normal" style={{ color: 'var(--text-secondary)' }}>
            GroupBuy lets creators, builders, and organizations pool funds to acquire expensive equipment, manage transparent equity ledgers down to the basis point, and schedule shared resource usage seamlessly.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link to="/register" className="btn-primary w-full sm:w-auto text-base px-6 py-3.5 shadow-xl shadow-indigo-600/20">
              Start Co-Owning Today <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="btn-secondary w-full sm:w-auto text-base px-6 py-3.5">
              Explore Demo Sandbox
            </Link>
          </div>

          {/* ── Interactive Platform Preview Card ────────────────────────── */}
          <div className="max-w-4xl mx-auto glass-card p-4 sm:p-6 text-left relative shadow-2xl border border-indigo-500/20">
            {/* Window frame top bar */}
            <div className="flex items-center justify-between pb-4 mb-5 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/60" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <span className="w-3 h-3 rounded-full bg-green-500/60" />
                <span className="text-xs font-mono ml-2 text-slate-400">groupbuy.platform / groups / lab-machinery-alpha</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="badge badge-success text-[11px] py-0.5">● Live Syndicate</span>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-5">
              {/* Syndicate overview */}
              <div className="md:col-span-2 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Shared Equipment Group</span>
                    <h3 className="text-xl font-bold text-white mt-0.5">Industrial Markforged 3D Printer</h3>
                    <p className="text-xs text-slate-400 mt-1">High-tensile carbon fiber additive manufacturing syndicate</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-emerald-400">₹3,75,000</div>
                    <div className="text-xs text-slate-400">of ₹5,00,000 target</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5 font-medium">
                    <span className="text-slate-300">Funding Progress (75%)</span>
                    <span className="text-indigo-300">7,500 / 10,000 Basis Points Allocated</span>
                  </div>
                  <div className="progress-track h-2.5">
                    <div className="progress-fill" style={{ width: '75%' }} />
                  </div>
                </div>

                {/* Member equity list mock */}
                <div className="grid grid-cols-3 gap-2.5 pt-2">
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div className="text-[11px] text-slate-400">Aarav (Lead)</div>
                    <div className="text-sm font-bold text-white">3,000 bps</div>
                    <div className="text-[10px] text-indigo-400">30.00% equity</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div className="text-[11px] text-slate-400">Dev Studio</div>
                    <div className="text-sm font-bold text-white">2,500 bps</div>
                    <div className="text-[10px] text-indigo-400">25.00% equity</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div className="text-[11px] text-slate-400">Rithvik (You)</div>
                    <div className="text-sm font-bold text-emerald-400">2,000 bps</div>
                    <div className="text-[10px] text-emerald-400">20.00% equity</div>
                  </div>
                </div>
              </div>

              {/* Resource scheduler preview */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/90 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-2.5">
                    <Calendar size={14} className="text-indigo-400" />
                    <span>Upcoming Reservations</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-2 rounded-lg bg-indigo-950/40 border border-indigo-900/40">
                      <div className="font-semibold text-indigo-200">Today: 14:00 - 18:00</div>
                      <div className="text-[11px] text-indigo-300/80">Slot reserved by Aarav K.</div>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-900/40">
                      <div className="font-semibold text-emerald-200">Tomorrow: 10:00 - 16:00</div>
                      <div className="text-[11px] text-emerald-300/80">Your Reserved Slot (Active)</div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Next Slot Available</span>
                  <span className="font-semibold text-indigo-400">Nov 2, 09:00</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Key Highlights Strip ────────────────────────────────────────── */}
      <section className="py-8 border-y" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1">
            <div className="text-xl sm:text-2xl font-black text-indigo-400">Paise Precision</div>
            <div className="text-xs text-slate-400 font-medium">Integer arithmetic · Zero rounding errors</div>
          </div>
          <div className="space-y-1">
            <div className="text-xl sm:text-2xl font-black text-purple-400">10,000 BPS</div>
            <div className="text-xs text-slate-400 font-medium">Strict basis point equity governance</div>
          </div>
          <div className="space-y-1">
            <div className="text-xl sm:text-2xl font-black text-emerald-400">Conflict-Free</div>
            <div className="text-xs text-slate-400 font-medium">Concurrency-safe slot reservations</div>
          </div>
          <div className="space-y-1">
            <div className="text-xl sm:text-2xl font-black text-amber-400">Simulated Wallet</div>
            <div className="text-xs text-slate-400 font-medium">Zero-risk playground for all workflows</div>
          </div>
        </div>
      </section>

      {/* ── How It Works (3 Steps) ──────────────────────────────────────── */}
      <section id="how-it-works" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="badge badge-primary text-xs uppercase tracking-wider mb-2">Automated Workflow</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">How GroupBuy Works</h2>
            <p className="text-sm sm:text-base text-slate-400 mt-2">
              Three simple steps to coordinate pooled capital, verify fractional ownership, and manage collective assets.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="glass-card p-6 relative flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 text-indigo-400 font-black text-lg bg-indigo-500/10 border border-indigo-500/30">
                  01
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Form or Discover a Syndicate</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-4">
                  Create a public or private group tailored for collective purchasing, shared commercial equipment, or a joint business venture with clear target funding.
                </p>
              </div>
              <ul className="space-y-2 text-xs text-slate-300 pt-4 border-t border-slate-800">
                <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-indigo-400" /> Granular Admin & Member Roles</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-indigo-400" /> Private Invitation Tokens</li>
              </ul>
            </div>

            {/* Step 2 */}
            <div className="glass-card p-6 relative flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 text-purple-400 font-black text-lg bg-purple-500/10 border border-purple-500/30">
                  02
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Contribute & Mint Equity</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-4">
                  Members fund their portion using simulated wallets. Contributions are tracked in paise and automatically converted into basis points equity.
                </p>
              </div>
              <ul className="space-y-2 text-xs text-slate-300 pt-4 border-t border-slate-800">
                <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-purple-400" /> OCC Concurrency Protection</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-purple-400" /> Real-time Funding Audit Trails</li>
              </ul>
            </div>

            {/* Step 3 */}
            <div className="glass-card p-6 relative flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 text-emerald-400 font-black text-lg bg-emerald-500/10 border border-emerald-500/30">
                  03
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Schedule & Utilize Assets</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-4">
                  Once funded, register the shared equipment. Members view available slots and book conflict-free reservations directly from their dashboard.
                </p>
              </div>
              <ul className="space-y-2 text-xs text-slate-300 pt-4 border-t border-slate-800">
                <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-400" /> Live Socket.IO Chat Room</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-400" /> Fair-Usage Scheduling</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Interactive Savings Calculator ──────────────────────────────── */}
      <section id="calculator" className="py-20" style={{ background: 'var(--bg-secondary)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="badge badge-warning text-xs uppercase tracking-wider mb-2">Co-Ownership Economics</span>
            <h2 className="text-3xl font-extrabold text-white">Savings & Equity Calculator</h2>
            <p className="text-sm text-slate-400 mt-1">
              See how fractional co-ownership drastically slashes your capital expenditure.
            </p>
          </div>

          <div className="glass-card p-6 sm:p-10 border border-indigo-500/20">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              {/* Sliders */}
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm font-semibold mb-2">
                    <span className="text-slate-300">Total Asset Cost</span>
                    <span className="text-indigo-400 font-mono text-base">₹{assetPrice.toLocaleString('en-IN')}</span>
                  </div>
                  <input
                    type="range"
                    min="50000"
                    max="2000000"
                    step="25000"
                    value={assetPrice}
                    onChange={(e) => setAssetPrice(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                    <span>₹50,000</span>
                    <span>₹10,00,000</span>
                    <span>₹20,00,000</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm font-semibold mb-2">
                    <span className="text-slate-300">Syndicate Members</span>
                    <span className="text-indigo-400 font-mono text-base">{memberCount} co-owners</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="20"
                    step="1"
                    value={memberCount}
                    onChange={(e) => setMemberCount(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                    <span>2 members</span>
                    <span>10 members</span>
                    <span>20 members</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
                  <Sliders size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                  <span>
                    Each co-owner receives a legally verifiable share of <strong>{basisPointsPerMember} basis points</strong> ({(basisPointsPerMember / 100).toFixed(2)}% equity) recorded in integer precision.
                  </span>
                </div>
              </div>

              {/* Result card */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-slate-900 border border-indigo-500/30 text-center space-y-5">
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Your Co-Ownership Cost</div>
                  <div className="text-4xl font-extrabold text-white mt-1 font-mono">
                    ₹{costPerMember.toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">instead of paying ₹{assetPrice.toLocaleString('en-IN')} upfront</div>
                </div>

                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-sm font-bold">
                  <TrendingUp size={16} />
                  <span>Save {savingsPercent}% on Capital Investment</span>
                </div>

                <div className="pt-4 border-t border-slate-800/80">
                  <Link to="/register" className="btn-primary w-full justify-center py-3">
                    Start a {memberCount}-Member Syndicate <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Core Use Cases ──────────────────────────────────────────────── */}
      <section id="use-cases" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="badge badge-info text-xs uppercase tracking-wider mb-2">Versatile Syndicates</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Engineered For Real-World Scenarios</h2>
            <p className="text-sm sm:text-base text-slate-400 mt-2">
              Whether you are an independent creator studio, a farmers' cooperative, or a hardware startup team.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="glass-card p-6 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 mb-5">
                  <Box size={22} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Shared Hardware & Lab Equipment</h3>
                <p className="text-sm text-slate-400 mb-4">
                  Pool capital to purchase expensive 3D printers, CNC cutting tables, VR testing headsets, or drone rigs, complete with booking calendar enforcement.
                </p>
              </div>
              <div className="text-xs font-semibold text-indigo-400 flex items-center gap-1">
                Explore Shared Equipment <ArrowUpRight size={14} />
              </div>
            </div>

            <div className="glass-card p-6 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-purple-500/10 border border-purple-500/30 text-purple-400 mb-5">
                  <DollarSign size={22} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Bulk Purchases & Wholesaling</h3>
                <p className="text-sm text-slate-400 mb-4">
                  Aggregate demand across small businesses to unlock wholesale pricing on raw manufacturing materials, electronic parts, or office inventories.
                </p>
              </div>
              <div className="text-xs font-semibold text-purple-400 flex items-center gap-1">
                Explore Collective Purchases <ArrowUpRight size={14} />
              </div>
            </div>

            <div className="glass-card p-6 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-5">
                  <Award size={22} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Joint Business Ventures</h3>
                <p className="text-sm text-slate-400 mb-4">
                  Co-finance revenue-generating commercial assets like food trucks, solar microgrids, or commercial vending machines with automated equity splits.
                </p>
              </div>
              <div className="text-xs font-semibold text-amber-400 flex items-center gap-1">
                Explore Business Ventures <ArrowUpRight size={14} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ Section ─────────────────────────────────────────────────── */}
      <section id="faq" className="py-20 border-t" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-14">
            <span className="badge badge-primary text-xs uppercase tracking-wider mb-2">Got Questions?</span>
            <h2 className="text-3xl font-extrabold text-white">Frequently Asked Questions</h2>
            <p className="text-sm text-slate-400 mt-1">
              Everything you need to know about the architecture and usage of GroupBuy.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="glass-card p-5 cursor-pointer transition-colors"
                onClick={() => toggleFaq(idx)}
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="font-semibold text-sm sm:text-base text-white">{faq.q}</span>
                  {activeFaq === idx ? (
                    <ChevronUp size={18} className="text-indigo-400 shrink-0" />
                  ) : (
                    <ChevronDown size={18} className="text-slate-400 shrink-0" />
                  )}
                </div>
                {activeFaq === idx && (
                  <p className="mt-3 text-sm text-slate-400 leading-relaxed border-t border-slate-800 pt-3 animate-fade-in">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ──────────────────────────────────────────────────── */}
      <section className="py-20 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-slate-900 border border-indigo-500/30 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
              Ready to create your first collaborative syndicate?
            </h2>
            <p className="text-slate-300 max-w-xl mx-auto mb-8 text-sm sm:text-base">
              Join or create groups in seconds. Experience risk-free simulated transactions and explore conflict-free asset bookings.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register" className="btn-primary px-8 py-3.5 text-base">
                Create Free Account <ArrowRight size={16} />
              </Link>
              <Link to="/login" className="btn-secondary px-8 py-3.5 text-base">
                Sign In to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="py-12 border-t" style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-600 text-white font-bold">
                <Users size={16} />
              </div>
              <span className="font-bold text-white text-base">GroupBuy</span>
              <span className="text-xs text-slate-500 ml-2">© 2026 GroupBuy Inc. All rights reserved.</span>
            </div>

            <div className="text-xs text-slate-400 text-center md:text-right">
              Built with precision: <strong className="text-slate-300">Integer Paise</strong> & <strong className="text-slate-300">10,000 Basis Points</strong> architecture.
              <br />
              All monetary operations are simulated for demonstration purposes.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
