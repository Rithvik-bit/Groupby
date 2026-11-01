import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import GhostFibers from '../components/GhostFibers'
import SpotlightCard from '../components/SpotlightCard'
import AnimatedCounter from '../components/AnimatedCounter'
import Logo from '../components/Logo'
import {
  Users, Calendar, ArrowRight, Check,
  ChevronDown, ChevronUp, Clock, ShieldCheck,
  CheckCircle2, Sparkles, Layers, RefreshCw,
  ArrowDown, ChevronRight, Share2, Shield, Coins,
  Laptop, CheckCircle, Flame, ArrowUpRight
} from 'lucide-react'

export default function Landing() {
  const [activeFaq, setActiveFaq] = useState(null)
  const [activeTab, setActiveTab] = useState('camera')
  const [scrollY, setScrollY] = useState(0)

  // Listen to window scroll for dynamic background blur and fade
  useEffect(() => {
    let ticking = false
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrollY(window.scrollY)
          ticking = false
        })
        ticking = true
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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
    { item: 'Sony FX3 Cinema Rig', retail: 380000, split4: 95000, split8: 47500, timePerMonth: '7–10 days' },
    { item: 'Bambu Lab X1-Carbon 3D Printer', retail: 145000, split4: 36250, split8: 18125, timePerMonth: 'Unlimited Queue' },
    { item: 'Hasselblad 907X 50C Medium Format', retail: 620000, split4: 155000, split8: 77500, timePerMonth: '5–8 days' },
    { item: 'Shaper Origin Handheld CNC', retail: 290000, split4: 72500, split8: 36250, timePerMonth: '8–12 days' }
  ]

  const faqs = [
    {
      q: "How does co-ownership actually work on GroupBuy?",
      a: "Members join a group focused on acquiring a specific asset or venture. Each member contributes simulated funds in integer paise. When the target is reached, fractional equity is assigned in exact basis points (10,000 basis points = 100.00%). Members then reserve calendar slots on a collision-free scheduler."
    },
    {
      q: "Why are amounts tracked in paise rather than floats?",
      a: "Standard floating-point arithmetic in databases and JavaScript creates rounding drift (0.1 + 0.2 = 0.30000000000000004). GroupBuy eliminates rounding errors entirely by storing all financial targets, ledger records, and member contributions as integer paise (1 INR = 100 paise)."
    },
    {
      q: "How do members share equipment without scheduling conflicts?",
      a: "Every co-owned physical asset has an atomic booking ledger. Active co-owners reserve start and end times. The backend runs interval collision checks before locking the slot, guaranteeing zero double-bookings."
    },
    {
      q: "Can members transfer or sell their ownership share later?",
      a: "Yes. GroupBuy includes a 2-party handshake transfer system. A seller proposes a share transfer (in basis points) with an agreed price. Once the buyer accepts, the group administrator approves and the system atomically updates the equity records."
    },
    {
      q: "Do I have to connect a real credit card or bank account?",
      a: "No. The platform currently runs in simulated payment mode. You can create groups, simulate contributions in paise, test ownership splits, and book equipment without spending real money."
    }
  ]

  // Dynamic blur and opacity values derived from window scroll
  const backdropBlur = Math.min(28, (scrollY * 0.035)).toFixed(1)
  const backdropOpacity = Math.max(0.18, (0.85 - scrollY * 0.0006)).toFixed(2)
  const backdropScale = (1 + Math.min(0.08, scrollY * 0.0001)).toFixed(3)

  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* ── Dynamic Persistent Background with Scroll Blur ──────────────── */}
      <div
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden transition-[filter,opacity] duration-200 ease-out"
        style={{
          filter: `blur(${backdropBlur}px)`,
          opacity: backdropOpacity,
          transform: `scale(${backdropScale})`,
        }}
      >
        <GhostFibers
          glowColor="#4f46e5"
          secondaryColor="#06b6d4"
          lineColor="#e0e7ff"
          layers={3}
          twist={0.82}
          threads={72}
          fiberStyle="dots"
          depthOfField={0.82}
          hoverEffect="focus"
          intro={true}
          mouseInteraction={true}
          pulseOnClick={true}
          waves={1.5}
          volume={0.24}
          rotation={20}
          density={0.9}
          foldGlow={1.8}
          speed={0.45}
          scale={1.1}
        />
      </div>

      {/* Subtle Dark Radial Gradient Vignette for Razor-sharp Text Contrast */}
      <div
        className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-300"
        style={{
          background: 'radial-gradient(ellipse at 50% 20%, transparent 0%, rgba(9, 9, 11, 0.4) 60%, #09090b 100%)',
          opacity: Math.min(1, 0.4 + scrollY * 0.001),
        }}
      />

      {/* ── Navigation (Sticky with backdrop-blur) ───────────────────────── */}
      <header className="sticky top-0 z-40 border-b backdrop-blur-md bg-zinc-950/80 transition-all" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Logo variant="full" size="sm" to="/" />

          <nav className="hidden sm:flex items-center gap-6 text-xs text-zinc-400">
            <a href="#product-preview" className="hover:text-white transition-colors">Interface</a>
            <a href="#live-preview" className="hover:text-white transition-colors">Live Bento</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">Workflow</a>
            <a href="#pricing-breakdown" className="hover:text-white transition-colors">Economics</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-2.5">
            <Link to="/login" className="btn-secondary btn-sm text-xs">
              Log in
            </Link>
            <Link to="/register" className="btn-primary btn-sm text-xs shadow-sm shadow-indigo-500/20">
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero Section (Full Viewport Height) ─────────────────────────── */}
      <section className="relative z-10 min-h-[calc(100vh-3.5rem)] flex flex-col justify-center items-center text-center px-4 py-16 sm:py-24">
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          {/* Status Badge Chip */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-medium text-indigo-300 bg-indigo-950/80 border border-indigo-500/40 mb-6 shadow-xl shadow-indigo-950/50 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Exact 10,000 Basis Points · Integer Paise Precision</span>
          </div>

          {/* Main Hero Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white max-w-4xl leading-[1.08] mb-6 drop-shadow-sm">
            Buy Together. <br className="hidden sm:inline" />
            Own Together.{' '}
            <span style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Grow Together.
            </span>
          </h1>

          {/* Core Concept Subtitle */}
          <p className="text-base sm:text-xl text-zinc-300 max-w-2xl mx-auto leading-relaxed mb-8 drop-shadow">
            Collectively acquire expensive assets, share audited fractional ownership in basis points, coordinate usage on conflict-free booking calendars, communicate privately, and manage equity transfers seamlessly.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
            <Link
              to="/register"
              className="btn-primary text-sm sm:text-base px-6 py-3 shadow-lg shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-all duration-150 font-semibold flex items-center gap-2 rounded-xl"
            >
              <span>Create a group</span>
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/login"
              className="btn-secondary text-sm sm:text-base px-6 py-3 rounded-xl border border-zinc-700 bg-zinc-900/80 hover:bg-zinc-800 backdrop-blur-md transition-all font-medium"
            >
              Explore demo sandbox
            </Link>
          </div>

          {/* Social Proof / Security Indicator */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle size={14} className="text-emerald-400" />
              Simulated sandbox payments
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-indigo-400" />
              10,000 bps audited invariant
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <Flame size={14} className="text-amber-400" />
              Instant interactive test accounts
            </span>
          </div>

          {/* Scroll Down Prompt Indicator */}
          <div className="mt-14 flex flex-col items-center gap-1 text-[11px] font-mono text-zinc-500 animate-bounce">
            <span>Scroll to explore platform interface</span>
            <ArrowDown size={14} />
          </div>
        </div>
      </section>

      {/* ── Section 1: Floating SaaS Interface Mockup Frame ───────────────── */}
      <section id="product-preview" className="relative z-10 py-16 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-xs font-mono text-indigo-400 uppercase tracking-wider mb-2">Full-Lifecycle Co-Ownership Platform</p>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">Everything after the purchase is handled.</h2>
          <p className="text-sm text-zinc-400 mt-2 max-w-xl mx-auto">
            Traditional group-buying stops at delivery. GroupBuy manages fractional shares, reservations, maintenance, chat, and equity transfers.
          </p>
        </div>

        {/* Floating Glassmorphic Workspace Mockup */}
        <div className="rounded-2xl border border-zinc-700/80 bg-zinc-950/80 p-2 sm:p-4 shadow-2xl shadow-indigo-950/50 backdrop-blur-xl">
          {/* Window Chrome Header */}
          <div className="flex items-center justify-between pb-3 px-2 border-b border-zinc-800/80">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
              <span className="ml-2 font-mono text-[11px] text-zinc-500">app.groupbuy.dev/photography-collective</span>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              ● Active Syndicate Ledger
            </span>
          </div>

          {/* Mockup Workspace Body */}
          <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left Mockup Panel: Asset & Funding */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <span className="badge badge-primary text-[10px] mb-1 inline-block">Shared Cinema Rig</span>
                  <h3 className="text-lg font-bold text-white">Canon EOS R6 Mark II + 24-105mm Kit</h3>
                  <p className="text-xs text-zinc-400">Full-frame co-op asset · Stored at Bengaluru Studio Hub</p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-zinc-400">Target Capital</div>
                  <div className="text-lg font-mono font-bold text-white">₹2,50,000</div>
                </div>
              </div>

              {/* Visual Equity Split Bar */}
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-white flex items-center gap-1.5">
                    <Coins size={14} className="text-indigo-400" />
                    <span>Equity Ownership Distribution</span>
                  </span>
                  <span className="font-mono text-indigo-400">10,000 / 10,000 bps (100%)</span>
                </div>
                <div className="w-full h-3 rounded-full overflow-hidden flex bg-zinc-800">
                  <div style={{ width: '55.56%' }} className="bg-indigo-600 h-full" title="Alice: 55.56%" />
                  <div style={{ width: '44.44%' }} className="bg-cyan-500 h-full" title="Bob: 44.44%" />
                </div>
                <div className="flex justify-between text-[11px] text-zinc-400 pt-1">
                  <span>Alice [DEMO]: <strong>5,556 bps (55.56%)</strong></span>
                  <span>Bob [DEMO]: <strong>4,444 bps (44.44%)</strong></span>
                </div>
              </div>

              {/* Simulated Contribution Ticker */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800 text-xs">
                  <span className="text-zinc-500 block text-[11px]">Latest Simulated Contribution</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">+₹80,000.00</span>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">Recorded in integer paise</span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800 text-xs">
                  <span className="text-zinc-500 block text-[11px]">Transfer Status</span>
                  <span className="badge badge-warning text-[10px] mt-1 inline-block">10% Transfer Awaiting Buyer</span>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">Alice → Bob proposed</span>
                </div>
              </div>
            </div>

            {/* Right Mockup Panel: Shared Calendar Preview */}
            <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                    <Calendar size={14} className="text-emerald-400" />
                    <span>Booking Schedule</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded">Collision-free</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800">
                    <div className="flex justify-between font-medium text-white">
                      <span>Fri, Nov 6</span>
                      <span className="text-indigo-400">Alice [DEMO]</span>
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">Commercial shoot · 09:00 - 18:00</div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800">
                    <div className="flex justify-between font-medium text-white">
                      <span>Sat–Sun, Nov 7–8</span>
                      <span className="text-cyan-400">Bob [DEMO]</span>
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">Weekend documentary shoot</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-800 text-center">
                <Link to="/login" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1">
                  <span>Sign into live demo sandbox</span>
                  <ChevronRight size={13} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 2: 4 Core Pillars Grid ──────────────────────────────── */}
      <section className="relative z-10 py-16 px-4 sm:px-6 max-w-6xl mx-auto border-t border-zinc-800/80">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs font-mono text-indigo-400 uppercase tracking-wider mb-2">Engineered For Fairness</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Four pillars of fractional co-ownership</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Engineered from database constraints up to guarantee transparency, trust, and complete dispute prevention.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SpotlightCard className="p-5 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
                <Coins size={20} />
              </div>
              <h3 className="font-semibold text-white text-sm mb-2">Integer Paise Ledger</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                No floating-point rounding errors. Every rupee is stored as 100 integer paise with immutable append-only receipts.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-800/80 font-mono text-[11px] text-zinc-500">
              ₹1 = 100 paise invariant
            </div>
          </SpotlightCard>

          <SpotlightCard className="p-5 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                <ShieldCheck size={20} />
              </div>
              <h3 className="font-semibold text-white text-sm mb-2">10,000 Basis Points</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Shares are recorded in basis points summing to exactly 10,000 (100.00%). Transparent co-ownership with zero ambiguity.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-800/80 font-mono text-[11px] text-emerald-400">
              100 bps = 1.00% equity
            </div>
          </SpotlightCard>

          <SpotlightCard className="p-5 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4">
                <Calendar size={20} />
              </div>
              <h3 className="font-semibold text-white text-sm mb-2">Collision-Free Booking</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Shared calendars with atomic validation guarantee equipment is never double-booked. Fair access for all members.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-800/80 font-mono text-[11px] text-cyan-400">
              Interval overlap locks
            </div>
          </SpotlightCard>

          <SpotlightCard className="p-5 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
                <Share2 size={20} />
              </div>
              <h3 className="font-semibold text-white text-sm mb-2">Equity Share Transfers</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Relocating or exiting? Propose a transfer of your basis points to another active member with administrator sign-off.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-800/80 font-mono text-[11px] text-purple-400">
              2-party handshake + sign-off
            </div>
          </SpotlightCard>
        </div>
      </section>

      {/* ── Section 3: React Bits Interactive Bento Grid ─────────────────── */}
      <section id="live-preview" className="relative z-10 py-16 border-t border-zinc-800/80" style={{ background: 'var(--bg-secondary)' }}>
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
            {/* Bento Card 1: Asset Header & Progress */}
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

            {/* Bento Card 2: Precision Metric Highlight */}
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

            {/* Bento Card 3: Ownership Ledger */}
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

      {/* ── Section 4: SaaS Workflow (4 Steps) ──────────────────────────── */}
      <section id="how-it-works" className="relative z-10 py-16 border-t border-zinc-800/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-mono text-indigo-400 uppercase tracking-wider mb-1">Simple Workflow</p>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Four steps to own and use equipment</h2>
            <p className="text-sm text-zinc-400 mt-1">
              GroupBuy handles the accounting, calendar locks, and equity transfers so you don't have to manage spreadsheets.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SpotlightCard>
              <div className="text-xs font-mono font-bold text-indigo-400 mb-3 px-2 py-1 bg-indigo-500/10 rounded w-fit border border-indigo-500/20">
                STEP 01
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">Create your syndicate</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Set a target funding amount in rupees and invite members. Choose between public discovery or private links.
              </p>
            </SpotlightCard>

            <SpotlightCard>
              <div className="text-xs font-mono font-bold text-indigo-400 mb-3 px-2 py-1 bg-indigo-500/10 rounded w-fit border border-indigo-500/20">
                STEP 02
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">Simulate capital</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Members contribute their share. The ledger records every transaction in integer paise and issues exact basis points.
              </p>
            </SpotlightCard>

            <SpotlightCard>
              <div className="text-xs font-mono font-bold text-indigo-400 mb-3 px-2 py-1 bg-indigo-500/10 rounded w-fit border border-indigo-500/20">
                STEP 03
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">Reserve usage slots</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Register physical equipment. Members book date and time slots on the shared calendar with automated conflict detection.
              </p>
            </SpotlightCard>

            <SpotlightCard>
              <div className="text-xs font-mono font-bold text-indigo-400 mb-3 px-2 py-1 bg-indigo-500/10 rounded w-fit border border-indigo-500/20">
                STEP 04
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">Transfer &amp; exit</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Need to move or cash out? Propose equity transfer directly to active group members with administrator sign-off.
              </p>
            </SpotlightCard>
          </div>
        </div>
      </section>

      {/* ── Section 5: Cost Comparison Table ─────────────────────────────── */}
      <section id="pricing-breakdown" className="relative z-10 py-16 border-t border-zinc-800/80" style={{ background: 'var(--bg-secondary)' }}>
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

      {/* ── Section 6: FAQ Accordion ─────────────────────────────────────── */}
      <section id="faq" className="relative z-10 py-16 border-t border-zinc-800/80">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="mb-10 text-center">
            <p className="text-xs font-mono text-indigo-400 uppercase tracking-wider mb-1">Architecture Details</p>
            <h2 className="text-xl sm:text-3xl font-bold text-white tracking-tight">Frequently asked questions</h2>
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

      {/* ── Section 7: Final SaaS Conversion CTA Banner ───────────────────── */}
      <section className="relative z-10 py-20 border-t border-zinc-800/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <SpotlightCard className="text-center py-14 px-6 sm:px-14 bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border-zinc-700/80 shadow-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono text-indigo-300 bg-indigo-950/80 border border-indigo-500/30 mb-4">
              <span>Ready to test co-ownership?</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white mb-3 tracking-tight">
              Start an equipment syndicate in two minutes
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto mb-8 leading-relaxed">
              Test simulated funding, fractional equity splits, conflict-free booking, and transfer proposals in our demo sandbox.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/register" className="btn-primary text-sm px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30">
                Create an account
              </Link>
              <Link to="/login" className="btn-secondary text-sm px-6 py-2.5 rounded-xl">
                Sign in with demo login
              </Link>
            </div>
          </SpotlightCard>
        </div>
      </section>

      {/* ── Section 8: Branded Footer ────────────────────────────────────── */}
      <footer className="relative z-10 py-12 border-t text-xs text-zinc-400" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
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
                <div><a href="#product-preview" className="hover:text-white transition-colors">Interface</a></div>
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
