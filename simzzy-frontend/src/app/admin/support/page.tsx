'use client'

import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Search, Send, X } from 'lucide-react'
import StatusPill from '@/components/admin/StatusPill'
import Drawer from '@/components/admin/Drawer'
import { toast } from '@/store/toast'
import { cn } from '@/lib/utils'
import {
  fetchAdminTicket, fetchAdminTickets, replyToAdminTicket, setAdminTicketStatus,
  type AdminTicketDetail, type AdminTicketSummary,
} from '@/lib/admin-client'

const STATUS_COLOR: Record<string, 'green' | 'yellow' | 'purple' | 'gray'> = {
  OPEN: 'green', IN_PROGRESS: 'purple', RESOLVED: 'green', CLOSED: 'gray',
}
const PRIORITY_COLOR: Record<string, 'gray' | 'yellow' | 'red' | 'green'> = {
  LOW: 'gray', MEDIUM: 'yellow', HIGH: 'red', URGENT: 'red',
}
const FILTER_STATUSES = ['all', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const

const INPUT =
  'w-full px-4 py-3 text-[13px] rounded-[10px] outline-none transition-all duration-300 bg-white/[0.04] text-primary placeholder:text-muted border border-border focus:border-accent-purple focus:bg-white/[0.06]'

export default function AdminSupportPage() {
  const [status, setStatus] = useState<(typeof FILTER_STATUSES)[number]>('all')
  const [search, setSearch] = useState('')
  const [tickets, setTickets] = useState<AdminTicketSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<AdminTicketDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      setTickets(await fetchAdminTickets({
        status: status === 'all' ? undefined : status,
        q: search.trim() || undefined,
      }))
    } catch (e) {
      setError((e as Error).message ?? 'Failed to load tickets')
    } finally { setLoading(false) }
  }, [status, search])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!selectedId) { setDetail(null); return }
    let active = true
    setDetailLoading(true)
    fetchAdminTicket(selectedId)
      .then((t) => { if (active) setDetail(t) })
      .catch((e) => active && toast.error('Failed to load ticket', (e as Error).message))
      .finally(() => active && setDetailLoading(false))
    return () => { active = false }
  }, [selectedId])

  async function changeStatus(s: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED') {
    if (!detail) return
    try {
      const updated = await setAdminTicketStatus(detail.id, s)
      setDetail(updated)
      toast.success(`Ticket → ${s.toLowerCase()}`)
      load()
    } catch (e) { toast.error('Status change failed', (e as Error).message) }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="font-mono text-[10px] font-bold tracking-[2px] uppercase text-accent-pink mb-2">Support</p>
          <h1 className="text-2xl md:text-[28px] font-extrabold tracking-tight">Ticket Queue</h1>
          <p className="text-[13px] text-muted mt-1">{tickets.length} tickets match the current view</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-secondary text-[12px] hover:text-primary">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="sticky top-16 z-10 bg-card/80 backdrop-blur-md border border-border rounded-2xl p-3 flex flex-wrap items-center gap-3">
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}
          className="bg-mid border border-border rounded-lg px-3 py-2 text-[12px] text-primary focus:outline-none focus:border-border-hover">
          {FILTER_STATUSES.map((s) => <option key={s} value={s}>{s === 'all' ? 'All status' : s.replace('_',' ').toLowerCase()}</option>)}
        </select>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Subject or email"
            className="w-full pl-9 pr-3 py-2 bg-mid border border-border rounded-lg text-[12px] text-primary placeholder:text-muted focus:outline-none focus:border-border-hover" />
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {error && (
          <div className="px-5 py-3 border-b border-border bg-[rgba(255,45,120,0.06)] text-[12px] text-accent-pink">{error}</div>
        )}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-muted font-mono uppercase tracking-widest text-[10px] border-b border-border">
                <th className="px-5 py-3 font-semibold">Subject</th>
                <th className="px-5 py-3 font-semibold">Customer</th>
                <th className="px-5 py-3 font-semibold">Priority</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold text-right">Msgs</th>
                <th className="px-5 py-3 font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody>
              {loading && tickets.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-muted">Loading…</td></tr>
              ) : tickets.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-muted">No tickets match.</td></tr>
              ) : tickets.map((t) => (
                <tr key={t.id} onClick={() => setSelectedId(t.id)}
                  className="border-b border-border last:border-b-0 hover:bg-card-hover transition-colors cursor-pointer">
                  <td className="px-5 py-3 max-w-[280px]">
                    <p className="font-semibold text-primary truncate">{t.subject}</p>
                  </td>
                  <td className="px-5 py-3">
                    {t.customer ? (
                      <>
                        <p className="font-semibold text-secondary">{t.customer.name ?? '—'}</p>
                        <p className="text-muted text-[11px]">{t.customer.email}</p>
                      </>
                    ) : (
                      <span className="text-muted">guest</span>
                    )}
                  </td>
                  <td className="px-5 py-3"><StatusPill color={PRIORITY_COLOR[t.priority] ?? 'gray'}>{t.priority.toLowerCase()}</StatusPill></td>
                  <td className="px-5 py-3"><StatusPill color={STATUS_COLOR[t.status] ?? 'gray'}>{t.status.replace('_',' ').toLowerCase()}</StatusPill></td>
                  <td className="px-5 py-3 text-right text-muted font-mono">{t.messageCount}</td>
                  <td className="px-5 py-3 text-muted font-mono text-[11px]">{new Date(t.updatedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Drawer open={!!selectedId} onClose={() => setSelectedId(null)} title={detail?.subject ?? ''} width="560px">
        {detailLoading ? (
          <div className="flex justify-center py-10">
            <span className="w-7 h-7 rounded-full border-2 border-accent-purple/30 border-t-accent-purple animate-spin" />
          </div>
        ) : !detail ? null : (
          <ThreadDrawer detail={detail} onChangeStatus={changeStatus} onReplied={async () => {
            const refreshed = await fetchAdminTicket(detail.id)
            setDetail(refreshed)
            load()
          }} />
        )}
      </Drawer>
    </div>
  )
}

function ThreadDrawer({
  detail, onChangeStatus, onReplied,
}: {
  detail: AdminTicketDetail
  onChangeStatus: (s: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED') => void
  onReplied: () => Promise<void>
}) {
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!reply.trim()) return
    setSending(true)
    try {
      await replyToAdminTicket(detail.id, reply)
      setReply('')
      await onReplied()
      toast.success('Reply sent')
    } catch (err) {
      toast.error('Failed to send', (err as Error).message)
    } finally { setSending(false) }
  }

  return (
    <div className="flex flex-col gap-5 text-[13px]">
      <div className="flex items-center gap-2">
        <StatusPill color={PRIORITY_COLOR[detail.priority] ?? 'gray'}>{detail.priority.toLowerCase()}</StatusPill>
        <StatusPill color={STATUS_COLOR[detail.status] ?? 'gray'}>{detail.status.replace('_',' ').toLowerCase()}</StatusPill>
        <p className="text-[11px] text-muted font-mono ml-auto">Opened {new Date(detail.createdAt).toLocaleString()}</p>
      </div>

      {detail.customer && (
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="font-semibold">{detail.customer.name ?? '—'}</p>
          <p className="text-muted text-[12px]">{detail.customer.email}</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {detail.messages.map((m) => (
          <div key={m.id} className={cn(
            'p-3 rounded-[10px] border',
            m.authorType === 'USER'
              ? 'border-border bg-white/[0.02]'
              : 'border-accent-purple/40 bg-[rgba(147,51,234,0.06)]',
          )}>
            <p className="text-[11px] text-muted mb-1.5">
              {m.authorName ?? m.authorType.toLowerCase()} · {new Date(m.createdAt).toLocaleString()}
            </p>
            <p className="text-[13px] text-secondary whitespace-pre-wrap leading-relaxed">{m.body}</p>
          </div>
        ))}
      </div>

      <form onSubmit={send} className="border-t border-border pt-4">
        <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type a reply to the customer…"
          rows={3} className={cn(INPUT, 'resize-y mb-3')} />
        <div className="flex justify-between gap-2">
          <div className="flex gap-2 flex-wrap">
            {(['OPEN','IN_PROGRESS','RESOLVED','CLOSED'] as const).filter((s) => s !== detail.status).map((s) => (
              <button key={s} type="button" onClick={() => onChangeStatus(s)}
                className="px-3 py-2 rounded-md border border-border text-secondary text-[11px] font-mono hover:bg-card-hover hover:text-primary transition-all">
                → {s.replace('_',' ').toLowerCase()}
              </button>
            ))}
          </div>
          <button type="submit" disabled={sending || !reply.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-gradient-btn text-white text-[13px] font-bold hover:opacity-90 disabled:opacity-60 transition-opacity">
            <Send size={13} /> {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  )
}
