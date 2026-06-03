'use client'

import { useCallback, useEffect, useState } from 'react'
import { Ticket as TicketIcon, Send, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/store/toast'
import {
  createTicket,
  fetchMyTickets,
  fetchTicket,
  postTicketMessage,
  type TicketCategory,
  type TicketDetailDto,
  type TicketSummaryDto,
} from '@/lib/account-client'
import { useSession } from 'next-auth/react'

/**
 * Customer ticket center. Slots into the existing /support page below the FAQ —
 * the FAQ block is untouched. Authenticated users see their tickets + a
 * "Create ticket" button; unauthenticated users see a CTA pointing to /login.
 */

const CATEGORIES: { id: TicketCategory; label: string; desc: string }[] = [
  { id: 'ORDER_ISSUE',      label: 'Order Issue',      desc: 'Problem with a purchase you made' },
  { id: 'ACTIVATION_ISSUE', label: 'Activation Issue', desc: 'eSIM not connecting or QR not scanning' },
  { id: 'PAYMENT_ISSUE',    label: 'Payment Issue',    desc: 'Charged twice, refund needed, billing question' },
  { id: 'GENERAL',          label: 'General Support',  desc: 'Anything else' },
]

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'bg-[rgba(34,197,94,0.1)] border-[rgba(34,197,94,0.3)] text-accent-green',
  IN_PROGRESS: 'bg-[rgba(147,51,234,0.1)] border-[rgba(147,51,234,0.3)] text-accent-purple',
  RESOLVED: 'bg-[rgba(34,197,94,0.1)] border-[rgba(34,197,94,0.3)] text-accent-green',
  CLOSED: 'bg-[rgba(255,255,255,0.04)] border-border text-muted',
}

const INPUT =
  'w-full px-4 py-3 text-[13px] rounded-[10px] outline-none transition-all duration-300 bg-white/[0.04] text-primary placeholder:text-muted border border-border focus:border-accent-purple focus:bg-white/[0.06]'

export default function TicketCenter() {
  const { status } = useSession()
  const [tickets, setTickets] = useState<TicketSummaryDto[] | null>(null)
  const [activeTicket, setActiveTicket] = useState<TicketDetailDto | null>(null)
  const [composerOpen, setComposerOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (status !== 'authenticated') return
    setLoading(true)
    setError(null)
    try {
      setTickets(await fetchMyTickets())
    } catch (e) {
      setError((e as Error).message ?? 'Failed to load tickets')
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => { load() }, [load])

  if (status === 'loading') return null

  return (
    <section className="bg-deep border-t border-border py-16">
      <div className="max-w-[900px] mx-auto px-6">
        <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
          <div>
            <p className="font-mono text-[11px] font-bold tracking-[2px] uppercase text-accent-pink mb-2">
              My Tickets
            </p>
            <h2 className="text-[24px] md:text-[28px] font-extrabold tracking-tight">Support Center</h2>
            <p className="text-[13px] text-muted mt-1">
              Open a ticket and our team will get back to you within 24 hours.
            </p>
          </div>
          {status === 'authenticated' && !composerOpen && !activeTicket && (
            <button
              onClick={() => setComposerOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-gradient-btn text-white text-[13px] font-bold hover:opacity-90 transition-opacity"
            >
              <TicketIcon size={14} /> New Ticket
            </button>
          )}
        </div>

        {status !== 'authenticated' ? (
          <div className="bg-card border border-border rounded-[14px] p-10 text-center">
            <p className="text-[16px] font-semibold mb-2">Sign in to open a ticket</p>
            <p className="text-[13px] text-muted mb-5">
              Tickets are tied to your account so our team can look up your orders and eSIMs instantly.
            </p>
            <a href="/login?from=/support"
              className="inline-block px-6 py-3 rounded-[10px] bg-gradient-btn text-white text-[13px] font-bold hover:opacity-90 transition-opacity">
              Sign In
            </a>
          </div>
        ) : composerOpen ? (
          <Composer
            onCancel={() => setComposerOpen(false)}
            onCreated={(t) => {
              setComposerOpen(false)
              setActiveTicket(t)
              load()
            }}
          />
        ) : activeTicket ? (
          <TicketThread
            ticket={activeTicket}
            onClose={() => { setActiveTicket(null); load() }}
            onReplied={(t) => setActiveTicket(t)}
          />
        ) : loading ? (
          <div className="bg-card border border-border rounded-[14px] p-10 flex items-center justify-center">
            <span className="w-7 h-7 rounded-full border-2 border-accent-purple/30 border-t-accent-purple animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-card border border-border rounded-[14px] p-8 text-center">
            <p className="text-accent-pink text-[13px] mb-3">{error}</p>
            <button onClick={load} className="px-4 py-2 rounded-lg border border-border text-secondary text-[12px] hover:text-primary">
              Retry
            </button>
          </div>
        ) : !tickets || tickets.length === 0 ? (
          <div className="bg-card border border-border rounded-[14px] p-10 text-center">
            <p className="text-[14px] font-semibold mb-2">No tickets yet</p>
            <p className="text-[13px] text-muted">When you open a support request it&apos;ll appear here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {tickets.map((t) => (
              <button
                key={t.id}
                onClick={async () => {
                  try {
                    setActiveTicket(await fetchTicket(t.id))
                  } catch (e) {
                    toast.error('Failed to load ticket', (e as Error).message)
                  }
                }}
                className="bg-card border border-border rounded-[12px] p-4 text-left hover:border-border-hover hover:bg-card-hover transition-all"
              >
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className="text-[13px] font-semibold text-primary truncate">{t.subject}</span>
                  <span className={cn('px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.5px] border', STATUS_STYLES[t.status] ?? STATUS_STYLES.CLOSED)}>
                    {t.status.replace('_', ' ').toLowerCase()}
                  </span>
                </div>
                <p className="text-[11px] text-muted">
                  {t.category.replace('_', ' ').toLowerCase()} · {t.messageCount} message{t.messageCount === 1 ? '' : 's'} · {new Date(t.updatedAt).toLocaleString()}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

/* ─── Composer ─────────────────────────────────────────────────────────── */

function Composer({ onCancel, onCreated }: { onCancel: () => void; onCreated: (t: TicketDetailDto) => void }) {
  const [category, setCategory] = useState<TicketCategory>('GENERAL')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const ticket = await createTicket({ category, subject, body })
      toast.success('Ticket opened', 'We typically reply within 24 hours')
      onCreated(ticket)
    } catch (err) {
      toast.error('Failed to open ticket', (err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-[14px] p-6 relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-btn" />
      <div className="flex items-center justify-between mb-5">
        <p className="font-mono text-[11px] font-bold tracking-[2px] uppercase text-accent-pink">Open a new ticket</p>
        <button type="button" onClick={onCancel} className="w-7 h-7 rounded-md flex items-center justify-center text-muted hover:bg-card-hover hover:text-primary transition-all">
          <X size={14} />
        </button>
      </div>

      <label className="block text-[10px] font-mono uppercase tracking-widest text-muted font-bold mb-2">Category</label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-5">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            className={cn(
              'text-left p-3 rounded-lg border transition-all',
              category === c.id
                ? 'border-accent-purple bg-[rgba(147,51,234,0.06)]'
                : 'border-border hover:border-border-hover hover:bg-card-hover',
            )}
          >
            <p className="text-[13px] font-semibold">{c.label}</p>
            <p className="text-[11px] text-muted mt-0.5">{c.desc}</p>
          </button>
        ))}
      </div>

      <label className="block text-[10px] font-mono uppercase tracking-widest text-muted font-bold mb-2">Subject</label>
      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Short summary of the issue"
        className={cn(INPUT, 'mb-4')}
        required
        minLength={3}
        maxLength={200}
      />

      <label className="block text-[10px] font-mono uppercase tracking-widest text-muted font-bold mb-2">Message</label>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Tell us what's happening — include order IDs or eSIM details if relevant."
        rows={5}
        className={cn(INPUT, 'resize-y mb-5')}
        required
        minLength={5}
        maxLength={5000}
      />

      <div className="flex gap-2">
        <button type="button" onClick={onCancel}
          className="flex-1 px-4 py-3 rounded-[12px] border border-border text-secondary text-[13px] font-bold hover:bg-card-hover hover:text-primary transition-all">
          Cancel
        </button>
        <button type="submit" disabled={submitting}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-[12px] bg-gradient-btn text-white text-[13px] font-bold hover:opacity-90 disabled:opacity-60 transition-opacity">
          <Send size={13} /> {submitting ? 'Opening…' : 'Open ticket'}
        </button>
      </div>
    </form>
  )
}

/* ─── Thread ───────────────────────────────────────────────────────────── */

function TicketThread({
  ticket,
  onClose,
  onReplied,
}: {
  ticket: TicketDetailDto
  onClose: () => void
  onReplied: (t: TicketDetailDto) => void
}) {
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const closed = ticket.status === 'CLOSED'

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!reply.trim()) return
    setSending(true)
    try {
      await postTicketMessage(ticket.id, reply)
      setReply('')
      const refreshed = await fetchTicket(ticket.id)
      onReplied(refreshed)
    } catch (err) {
      toast.error('Failed to send', (err as Error).message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-card border border-border rounded-[14px] p-6 relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-btn" />
      <div className="flex items-start justify-between mb-4 gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-bold tracking-[2px] uppercase text-accent-pink mb-2">
            {ticket.category.replace('_', ' ').toLowerCase()} · {ticket.status.toLowerCase()}
          </p>
          <h3 className="text-[16px] font-bold truncate">{ticket.subject}</h3>
          <p className="text-[11px] text-muted mt-1">
            Opened {new Date(ticket.createdAt).toLocaleString()}
          </p>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-md flex items-center justify-center text-muted hover:bg-card-hover hover:text-primary transition-all">
          <X size={14} />
        </button>
      </div>

      <div className="flex flex-col gap-3 mb-5">
        {ticket.messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              'p-3 rounded-[10px] border',
              m.authorType === 'USER'
                ? 'border-border bg-white/[0.02]'
                : 'border-accent-purple/40 bg-[rgba(147,51,234,0.06)]',
            )}
          >
            <p className="text-[11px] text-muted mb-1.5">
              {m.authorName ?? m.authorType} · {new Date(m.createdAt).toLocaleString()}
            </p>
            <p className="text-[13px] text-secondary whitespace-pre-wrap leading-relaxed">{m.body}</p>
          </div>
        ))}
      </div>

      {closed ? (
        <p className="text-[12px] text-muted text-center py-3 border-t border-border">
          This ticket is closed. Open a new one if you need more help.
        </p>
      ) : (
        <form onSubmit={send} className="border-t border-border pt-4">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Type a reply…"
            rows={3}
            className={cn(INPUT, 'resize-y mb-3')}
            minLength={1}
            maxLength={5000}
          />
          <div className="flex justify-end">
            <button type="submit" disabled={sending || !reply.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-gradient-btn text-white text-[13px] font-bold hover:opacity-90 disabled:opacity-60 transition-opacity">
              <Send size={13} /> {sending ? 'Sending…' : 'Send reply'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
