'use client'

import { Pencil, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type RuleColumn<T> = {
  header: string
  render: (row: T) => React.ReactNode
  align?: 'left' | 'right'
  className?: string
}

type PricingRuleTableProps<T> = {
  title: string
  subtitle?: string
  addLabel?: string
  columns: RuleColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  onAdd?: () => void
  onEdit?: (row: T) => void
  onDelete?: (row: T) => void
  emptyText?: string
}

/**
 * Generic glass table for fixed-dollar pricing rules. The page supplies the
 * column renderers + CRUD callbacks, so the same component drives the country
 * and duration rule tables (and any future rule type).
 */
export default function PricingRuleTable<T>({
  title,
  subtitle,
  addLabel = 'Add Rule',
  columns,
  rows,
  rowKey,
  onAdd,
  onEdit,
  onDelete,
  emptyText = 'No rules yet.',
}: PricingRuleTableProps<T>) {
  const hasActions = !!onEdit || !!onDelete

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border">
        <div>
          <h3 className="text-[15px] font-bold">{title}</h3>
          {subtitle && <p className="text-[12px] text-muted mt-0.5">{subtitle}</p>}
        </div>
        {onAdd && (
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-btn text-white text-[12px] font-bold hover:opacity-90 hover:-translate-y-0.5 transition-all flex-shrink-0"
          >
            <Plus size={13} />
            {addLabel}
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="px-5 py-10 text-center text-muted text-[13px]">{emptyText}</p>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-muted font-mono uppercase tracking-widest text-[10px] border-b border-border">
                  {columns.map((col, i) => (
                    <th
                      key={i}
                      className={cn('px-5 py-3 font-semibold', col.align === 'right' && 'text-right')}
                    >
                      {col.header}
                    </th>
                  ))}
                  {hasActions && <th className="px-5 py-3 font-semibold text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={rowKey(row)}
                    className="border-b border-border last:border-b-0 hover:bg-card-hover transition-colors"
                  >
                    {columns.map((col, i) => (
                      <td
                        key={i}
                        className={cn('px-5 py-3', col.align === 'right' && 'text-right', col.className)}
                      >
                        {col.render(row)}
                      </td>
                    ))}
                    {hasActions && (
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {onEdit && (
                            <button
                              onClick={() => onEdit(row)}
                              className="w-7 h-7 rounded-md flex items-center justify-center text-muted hover:bg-card-hover hover:text-accent-purple transition-all"
                              title="Edit"
                            >
                              <Pencil size={13} />
                            </button>
                          )}
                          {onDelete && (
                            <button
                              onClick={() => onDelete(row)}
                              className="w-7 h-7 rounded-md flex items-center justify-center text-muted hover:bg-card-hover hover:text-accent-pink transition-all"
                              title="Delete"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="sm:hidden divide-y divide-border">
            {rows.map((row) => (
              <div key={rowKey(row)} className="p-4 flex flex-col gap-2">
                {columns.map((col, i) => (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-muted">
                      {col.header}
                    </span>
                    <span className="text-[13px] font-medium text-right">{col.render(row)}</span>
                  </div>
                ))}
                {hasActions && (
                  <div className="flex gap-2 pt-1">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(row)}
                        className="flex-1 px-3 py-1.5 rounded-md border border-border text-secondary text-[11px] font-semibold hover:bg-card-hover hover:text-primary transition-all inline-flex items-center justify-center gap-1.5"
                      >
                        <Pencil size={11} /> Edit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(row)}
                        className="px-3 py-1.5 rounded-md border border-border text-muted text-[11px] font-semibold hover:bg-card-hover hover:text-accent-pink transition-all inline-flex items-center justify-center"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
