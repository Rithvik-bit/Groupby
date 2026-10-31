import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { Plus, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const TYPE_INFO = {
  collective_purchase: {
    label: 'Collective Purchase',
    desc: 'Pool funds with others to collectively acquire a product or asset',
    icon: '🛒',
    color: '#6366f1',
  },
  shared_equipment: {
    label: 'Shared Equipment',
    desc: 'Purchase equipment together and share it via a booking calendar',
    icon: '⚙️',
    color: '#10b981',
  },
  business_venture: {
    label: 'Business Venture',
    desc: 'Launch and manage a collaborative business with shared ledger',
    icon: '🏢',
    color: '#f59e0b',
  },
}

const CATEGORIES = ['electronics', 'photography', 'printing', 'agriculture', 'workshop', 'vehicles', 'real_estate', 'services', 'other']

export default function CreateGroup() {
  const { accessToken } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    groupType: '',
    title: '',
    description: '',
    category: '',
    visibility: 'public',
    maxMembers: 10,
    targetAmountPaise: '',
    minContributionPaise: '',
    cancellationRules: '',
    rules: '',
    fundingDeadline: '',
    city: '',
    state: '',
    country: 'India',
  })

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async () => {
    setError('')
    setLoading(true)
    try {
      const payload = {
        ...form,
        targetAmountPaise: form.targetAmountPaise ? Math.round(parseFloat(form.targetAmountPaise) * 100) : 0,
        minContributionPaise: form.minContributionPaise ? Math.round(parseFloat(form.minContributionPaise) * 100) : 0,
        maxMembers: parseInt(form.maxMembers, 10),
      }
      const res = await api.post('/groups', payload, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      toast.success('Group created successfully!')
      navigate(`/groups/${res.data.data._id}`)
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to create group.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
          Create a Group
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Set up your collaborative group in a few steps
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
              style={{
                background: step >= s ? 'var(--gradient-primary)' : 'var(--bg-card)',
                color: step >= s ? 'white' : 'var(--text-secondary)',
                border: `1px solid ${step >= s ? 'transparent' : 'var(--border)'}`,
              }}
            >{s}</div>
            {s < 3 && <div className="flex-1 h-px" style={{ background: step > s ? '#6366f1' : 'var(--border)', width: '3rem' }} />}
          </div>
        ))}
        <span className="text-xs ml-2" style={{ color: 'var(--text-secondary)' }}>
          {step === 1 ? 'Choose type' : step === 2 ? 'Basic info' : 'Details'}
        </span>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl flex items-center gap-2 text-sm"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Step 1: Group type */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="section-title">What kind of group are you creating?</h2>
          {Object.entries(TYPE_INFO).map(([type, info]) => (
            <button
              key={type}
              id={`type-${type}`}
              onClick={() => { set('groupType', type); setStep(2) }}
              className="w-full text-left p-5 rounded-xl transition-all duration-200 flex items-start gap-4"
              style={{
                background: form.groupType === type ? `${info.color}12` : 'var(--bg-card)',
                border: `1px solid ${form.groupType === type ? info.color : 'var(--border)'}`,
              }}
            >
              <span className="text-3xl">{info.icon}</span>
              <div>
                <div className="font-semibold text-sm mb-0.5" style={{ color: 'var(--text-primary)' }}>{info.label}</div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{info.desc}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Step 2: Basic info */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="section-title">Basic Information</h2>
          <div className="form-group">
            <label className="label">Group Title *</label>
            <input className="input" placeholder="e.g. Photography Collective — Canon R6"
              value={form.title} onChange={e => set('title', e.target.value)} maxLength={100} />
          </div>
          <div className="form-group">
            <label className="label">Description *</label>
            <textarea className="input" rows={4} placeholder="Describe your group's purpose and goals..."
              value={form.description} onChange={e => set('description', e.target.value)} maxLength={2000}
              style={{ resize: 'vertical' }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="label">Category *</label>
              <select id="group-category" className="select" value={form.category} onChange={e => set('category', e.target.value)}>
                <option value="">Select...</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Visibility</label>
              <select id="group-visibility" className="select" value={form.visibility} onChange={e => set('visibility', e.target.value)}>
                <option value="public">Public</option>
                <option value="private">Private</option>
                <option value="unlisted">Unlisted</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setStep(1)}>Back</button>
            <button className="btn-primary flex-1" onClick={() => {
              if (!form.title || !form.category) { setError('Title and category are required.'); return }
              setError(''); setStep(3)
            }}>Continue</button>
          </div>
        </div>
      )}

      {/* Step 3: Details */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="section-title">Group Details</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="label">Max Members</label>
              <input type="number" className="input" min={2} max={200}
                value={form.maxMembers} onChange={e => set('maxMembers', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Target Amount (₹)</label>
              <input type="number" className="input" placeholder="e.g. 25000" min={0}
                value={form.targetAmountPaise} onChange={e => set('targetAmountPaise', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="label">Min Contribution per member (₹)</label>
            <input type="number" className="input" placeholder="e.g. 5000" min={0}
              value={form.minContributionPaise} onChange={e => set('minContributionPaise', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label">Group Rules & Guidelines</label>
            <textarea className="input" rows={2} placeholder="Usage guidelines, maintenance responsibilities, code of conduct..."
              value={form.rules} onChange={e => set('rules', e.target.value)}
              style={{ resize: 'vertical' }} />
          </div>
          <div className="form-group">
            <label className="label">Cancellation Policy</label>
            <textarea className="input" rows={2} placeholder="What happens if the group doesn't reach its goal?"
              value={form.cancellationRules} onChange={e => set('cancellationRules', e.target.value)}
              style={{ resize: 'vertical' }} />
          </div>
          <div className="form-group">
            <label className="label">Funding Deadline (Optional)</label>
            <input type="date" className="input" value={form.fundingDeadline} onChange={e => set('fundingDeadline', e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="form-group">
              <label className="label">City</label>
              <input className="input" placeholder="City" value={form.city} onChange={e => set('city', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">State</label>
              <input className="input" placeholder="State" value={form.state} onChange={e => set('state', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Country</label>
              <input className="input" placeholder="Country" value={form.country} onChange={e => set('country', e.target.value)} />
            </div>
          </div>
          <div className="sim-notice">
            <AlertCircle size={14} />
            All financial figures are <strong>simulated</strong>. No real money is collected.
          </div>
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setStep(2)}>Back</button>
            <button id="create-group-submit" className="btn-primary flex-1" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Creating...' : <><Plus size={15} /> Create Group</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
