'use client'

import { useCallback, useEffect, useState } from 'react'
import { Search, Eye, EyeOff, Check, X, Trash2, RefreshCw } from 'lucide-react'
import {
  fetchAdminReviews,
  setAdminReviewStatus,
  setAdminReviewHidden,
  deleteAdminReview,
  type AdminReviewDto,
  type ReviewStatsDto,
} from '@/lib/admin-client'
import StatusPill from '@/components/admin/StatusPill'
import { toast } from '@/store/toast'

const STATUS_COLOR: Record<string, 'green' | 'yellow' | 'gray' | 'red'> = {
  APPROVED: 'green',
  PENDING: 'yellow',
  REJECTED: 'red',
}

const STATUS_FILTERS = ['all', 'PENDING', 'APPROVED', 'REJECTED', 'HIDDEN'] as const
type StatusFilter = (typeof STATUS_FILTERS)[number]

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReviewDto[]>([])
  const [stats, setStats] = useState<ReviewStatsDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')

  const load = useCallback(async (s: StatusFilter, q: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAdminReviews({ status: s, q: q || undefined })
      setReviews(data.reviews)
      setStats(data.stats)
    } catch (e) {
      setError((e as Error).message ?? 'Failed to load reviews')
    } finally {
      setLoading(false)
    }
  }, [])

  // Single debounced effect drives both the status filter and the search box.
  useEffect(() => {
    const t = setTimeout(() => load(status, search), 250)
    return () => clearTimeout(t)
  }, [search, status, load])

  async function approve(r: AdminReviewDto) {
    try {
      await setAdminReviewStatus(r.id, 'APPROVED')
      toast.success('Review approved')
      load(status, search)
    } catch (e) { toast.error('Update failed', (e as Error).message) }
  }
  async function reject(r: AdminReviewDto) {
    try {
      await setAdminReviewStatus(r.id, 'REJECTED')
      toast.success('Review rejected')
      load(status, search)
    } catch (e) { toast.error('Update failed', (e as Error).message) }
  }
  async function toggleHidden(r: AdminReviewDto) {
    try {
      await setAdminReviewHidden(r.id, !r.hidden)
      toast.success(r.hidden ? 'Review restored' : 'Review hidden')
      load(status, search)
    } catch (e) { toast.error('Update failed', (e as Error).message) }
  }
  async function remove(r: AdminReviewDto) {
    try {
      await deleteAdminReview(r.id)
      setReviews((prev) => prev.filter((x) => x.id !== r.id))
      toast.info('Review deleted')
    } catch (e) { toast.error('Delete failed', (e as Error).message) }
  }

  const statTiles = stats
    ? [
        { label: 'Total reviews', value: stats.total.toLocaleString(), accent: 'text-primary' },
        { label: 'Avg rating', value: `${stats.avgRating} ★`, accent: 'text-yellow-400' },
        { label: 'Approved', value: stats.approved.toLocaleString(), accent: 'text-accent-green' },
        { label: 'Pending', value: stats.pending.toString(), accent: 'text-accent-pink' },
      ]
    : []

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono text-[10px] font-bold tracking-[2px] uppercase text-accent-pink mb-2">
            Community
          </p>
          <h1 className="text-2xl md:text-[28px] font-extrabold tracking-tight">Reviews</h1>
          <p className="text-[13px] text-muted mt-1">Moderate customer feedback</p>
        </div>
        <button
          onClick={() => load(status, search)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-secondary text-[12px] hover:text-primary"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && (
        <div className="border border-accent-pink/40 bg-accent-pink/[0.06] text-accent-pink rounded-2xl p-4">
          {error} — <button onClick={() => load(status, search)} className="underline">retry</button>
        </div>
      )}

      {/* Stat tiles */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statTiles.map((t) => (
            <div key={t.label} className="bg-card border border-border rounded-2xl p-4 relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-btn opacity-60" />
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-1.5">{t.label}</p>
              <p className={`text-[20px] font-extrabold ${t.accent}`}>{t.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="sticky top-16 z-10 bg-card/80 backdrop-blur-md border border-border rounded-2xl p-3 flex flex-wrap items-center gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
          className="bg-mid border border-border rounded-lg px-3 py-2 text-[12px] text-primary focus:outline-none focus:border-border-hover capitalize"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>{s === 'all' ? 'All status' : s.toLowerCase()}</option>
          ))}
        </select>

        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Reviewer, text or plan"
            className="w-full pl-9 pr-3 py-2 bg-mid border border-border rounded-lg text-[12px] text-primary placeholder:text-muted focus:outline-none focus:border-border-hover"
          />
        </div>
      </div>

      {/* Review list */}
      {reviews.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <p className="text-[40px] mb-3">💬</p>
          <p className="text-[15px] font-semibold mb-1">{loading ? 'Loading…' : 'No reviews found'}</p>
          <p className="text-[13px] text-muted">Try a different filter or search term.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {reviews.map((r) => (
            <div key={r.id} className="bg-card border border-border rounded-2xl p-5 hover:border-border-hover transition-colors">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-[26px] leading-none">{r.flag ?? '🌍'}</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-[14px]">{r.authorName}</p>
                    <p className="text-[11px] text-muted">
                      {[r.country, r.planName, new Date(r.createdAt).toLocaleDateString()].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-yellow-400 text-[13px] tracking-[2px]">{'★'.repeat(r.rating)}<span className="text-border">{'★'.repeat(5 - r.rating)}</span></span>
                  {r.hidden
                    ? <StatusPill color="gray">hidden</StatusPill>
                    : <StatusPill color={STATUS_COLOR[r.status] ?? 'gray'}>{r.status.toLowerCase()}</StatusPill>}
                </div>
              </div>

              <p className="text-[13px] text-secondary leading-relaxed mt-3 italic">&ldquo;{r.text}&rdquo;</p>

              <div className="flex items-center gap-2 mt-4 flex-wrap">
                {r.status !== 'APPROVED' && (
                  <button
                    onClick={() => approve(r)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-accent-green/30 text-accent-green text-[11px] font-bold hover:bg-accent-green/10 transition-all"
                  >
                    <Check size={12} /> Approve
                  </button>
                )}
                {r.status !== 'REJECTED' && (
                  <button
                    onClick={() => reject(r)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-accent-pink/30 text-accent-pink text-[11px] font-bold hover:bg-accent-pink/10 transition-all"
                  >
                    <X size={12} /> Reject
                  </button>
                )}
                <button
                  onClick={() => toggleHidden(r)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-secondary text-[11px] font-bold hover:bg-card-hover hover:text-primary transition-all"
                >
                  {r.hidden ? <><Eye size={12} /> Unhide</> : <><EyeOff size={12} /> Hide</>}
                </button>
                <button
                  onClick={() => remove(r)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-muted text-[11px] font-bold hover:bg-card-hover hover:text-accent-pink transition-all ml-auto"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
