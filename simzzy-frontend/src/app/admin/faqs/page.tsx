'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Search, RefreshCw, ArrowUp, ArrowDown } from 'lucide-react'
import {
  fetchAdminFaqs,
  createAdminFaq,
  updateAdminFaq,
  setAdminFaqPublished,
  deleteAdminFaq,
  reorderAdminFaqs,
  type AdminFaqDto,
} from '@/lib/admin-client'
import Modal from '@/components/admin/Modal'
import StatusPill from '@/components/admin/StatusPill'
import { cn } from '@/lib/utils'
import { toast } from '@/store/toast'

const FALLBACK_CATEGORIES = ['Getting Started', 'Installation', 'Payments', 'Coverage', 'Account']

export default function AdminFaqsPage() {
  const [faqs, setFaqs] = useState<AdminFaqDto[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState<string>('All')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<AdminFaqDto | null>(null)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAdminFaqs()
      setFaqs(data.faqs)
      setCategories(data.categories)
    } catch (e) {
      setError((e as Error).message ?? 'Failed to load FAQs')
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  const categoryOptions = categories.length ? categories : FALLBACK_CATEGORIES

  async function togglePublished(f: AdminFaqDto) {
    try {
      const updated = await setAdminFaqPublished(f.id, !f.isPublished)
      setFaqs((prev) => prev.map((x) => (x.id === f.id ? updated : x)))
    } catch (e) { toast.error('Update failed', (e as Error).message) }
  }

  async function remove(id: string) {
    try {
      await deleteAdminFaq(id)
      setFaqs((prev) => prev.filter((f) => f.id !== id))
      toast.info('FAQ deleted')
    } catch (e) { toast.error('Delete failed', (e as Error).message) }
  }

  async function move(f: AdminFaqDto, dir: -1 | 1) {
    // Reorder within the FAQ's own category.
    const inCat = faqs.filter((x) => x.category === f.category)
    const idx = inCat.findIndex((x) => x.id === f.id)
    const swap = idx + dir
    if (swap < 0 || swap >= inCat.length) return
    const reordered = [...inCat]
    ;[reordered[idx], reordered[swap]] = [reordered[swap], reordered[idx]]
    try {
      const updated = await reorderAdminFaqs(f.category, reordered.map((x) => x.id))
      // Splice the updated category back into the full list.
      setFaqs((prev) => {
        const others = prev.filter((x) => x.category !== f.category)
        return [...others, ...updated].sort((a, b) =>
          a.category === b.category ? a.sortOrder - b.sortOrder : a.category.localeCompare(b.category),
        )
      })
    } catch (e) { toast.error('Reorder failed', (e as Error).message) }
  }

  const filtered = useMemo(() => {
    return faqs.filter((f) => {
      if (category !== 'All' && f.category !== category) return false
      if (search) {
        const q = search.toLowerCase()
        if (!f.question.toLowerCase().includes(q) && !f.answer.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [faqs, category, search])

  // Reorder arrows only make sense in the unfiltered, category-grouped view.
  const canReorder = category !== 'All' && !search

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono text-[10px] font-bold tracking-[2px] uppercase text-accent-pink mb-2">
            Content
          </p>
          <h1 className="text-2xl md:text-[28px] font-extrabold tracking-tight">FAQs</h1>
          <p className="text-[13px] text-muted mt-1">{faqs.length} help articles</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-card text-secondary text-[12px] hover:text-primary"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-btn text-white text-[12px] font-bold hover:opacity-90 hover:-translate-y-0.5 transition-all"
          >
            <Plus size={14} />
            Add FAQ
          </button>
        </div>
      </div>

      {error && (
        <div className="border border-accent-pink/40 bg-accent-pink/[0.06] text-accent-pink rounded-2xl p-4">
          {error} — <button onClick={load} className="underline">retry</button>
        </div>
      )}

      {/* Filters */}
      <div className="sticky top-16 z-10 bg-card/80 backdrop-blur-md border border-border rounded-2xl p-3 flex flex-wrap items-center gap-3">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-mid border border-border rounded-lg px-3 py-2 text-[12px] text-primary focus:outline-none focus:border-border-hover"
        >
          <option value="All">All categories</option>
          {categoryOptions.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions"
            className="w-full pl-9 pr-3 py-2 bg-mid border border-border rounded-lg text-[12px] text-primary placeholder:text-muted focus:outline-none focus:border-border-hover"
          />
        </div>
        {canReorder && <span className="text-[11px] text-muted font-mono">Use ↑↓ to reorder within “{category}”.</span>}
      </div>

      {/* FAQ list */}
      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <p className="text-[40px] mb-3">📚</p>
          <p className="text-[15px] font-semibold mb-1">{loading ? 'Loading…' : 'No FAQs found'}</p>
          <p className="text-[13px] text-muted">Add a new article or adjust your filters.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((f, i) => (
            <div key={f.id} className="bg-card border border-border rounded-2xl p-5 hover:border-border-hover transition-colors">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <StatusPill color="purple">{f.category}</StatusPill>
                    <StatusPill color={f.isPublished ? 'green' : 'gray'}>
                      {f.isPublished ? 'published' : 'draft'}
                    </StatusPill>
                  </div>
                  <h3 className="text-[14px] font-bold">{f.question}</h3>
                  <p className="text-[12px] text-muted leading-relaxed mt-1.5">{f.answer}</p>
                </div>

                <div className="flex items-center gap-1.5">
                  {canReorder && (
                    <div className="flex flex-col">
                      <button
                        onClick={() => move(f, -1)}
                        disabled={i === 0}
                        className="w-6 h-5 rounded flex items-center justify-center text-muted hover:text-primary disabled:opacity-25"
                        title="Move up"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        onClick={() => move(f, 1)}
                        disabled={i === filtered.length - 1}
                        className="w-6 h-5 rounded flex items-center justify-center text-muted hover:text-primary disabled:opacity-25"
                        title="Move down"
                      >
                        <ArrowDown size={12} />
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => togglePublished(f)}
                    className={cn(
                      'relative w-10 h-5 rounded-full transition-colors flex-shrink-0',
                      f.isPublished ? 'bg-accent-purple' : 'bg-border',
                    )}
                    aria-label="Toggle published"
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                        f.isPublished ? 'translate-x-5' : 'translate-x-0.5',
                      )}
                    />
                  </button>
                  <button
                    onClick={() => setEditing(f)}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-muted hover:bg-card-hover hover:text-accent-purple transition-all"
                    title="Edit"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => remove(f.id)}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-muted hover:bg-card-hover hover:text-accent-pink transition-all"
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <FaqForm
        key={editing ? editing.id : creating ? '__new__' : '__closed__'}
        open={!!editing || creating}
        faq={editing}
        categories={categoryOptions}
        onClose={() => { setEditing(null); setCreating(false) }}
        onSaved={(saved) => {
          setFaqs((prev) => {
            const exists = prev.some((x) => x.id === saved.id)
            const next = exists ? prev.map((x) => (x.id === saved.id ? saved : x)) : [...prev, saved]
            return next.sort((a, b) =>
              a.category === b.category ? a.sortOrder - b.sortOrder : a.category.localeCompare(b.category),
            )
          })
          if (!categories.includes(saved.category)) setCategories((c) => [...c, saved.category].sort())
          setEditing(null)
          setCreating(false)
        }}
      />
    </div>
  )
}

/* ─── Add/edit modal ─────────────────────────────────────────────────────── */

type FaqFormProps = {
  open: boolean
  faq: AdminFaqDto | null
  categories: string[]
  onClose: () => void
  onSaved: (f: AdminFaqDto) => void
}

function FaqForm({ open, faq, categories, onClose, onSaved }: FaqFormProps) {
  const [question, setQuestion] = useState(faq?.question ?? '')
  const [answer, setAnswer] = useState(faq?.answer ?? '')
  const [category, setCategory] = useState<string>(faq?.category ?? categories[0] ?? 'General')
  const [isPublished, setIsPublished] = useState(faq?.isPublished ?? true)
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { category, question, answer, isPublished }
      const saved = faq ? await updateAdminFaq(faq.id, payload) : await createAdminFaq(payload)
      toast.success(faq ? 'FAQ updated' : 'FAQ created')
      onSaved(saved)
    } catch (e) {
      toast.error('Save failed', (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={faq ? 'Edit FAQ' : 'Add FAQ'} width="560px">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Question">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. How do I install on iPhone?"
            className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-[13px] text-primary placeholder:text-muted focus:outline-none focus:border-border-hover"
            required
          />
        </Field>

        <Field label="Category">
          <input
            type="text"
            list="faq-categories"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Getting Started"
            className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-[13px] text-primary placeholder:text-muted focus:outline-none focus:border-border-hover"
            required
          />
          <datalist id="faq-categories">
            {categories.map((c) => <option key={c} value={c} />)}
          </datalist>
        </Field>

        <Field label="Answer">
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={4}
            placeholder="Write the answer customers will see…"
            className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-[13px] text-primary placeholder:text-muted focus:outline-none focus:border-border-hover resize-none"
            required
          />
        </Field>

        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            className="w-4 h-4 accent-accent-purple"
          />
          <span className="text-[13px] text-secondary">Published</span>
        </label>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-border text-secondary text-[12px] font-bold hover:bg-card-hover hover:text-primary transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-btn text-white text-[12px] font-bold hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {saving ? 'Saving…' : faq ? 'Save changes' : 'Create FAQ'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-mono uppercase tracking-widest text-muted font-bold">{label}</label>
      {children}
    </div>
  )
}
