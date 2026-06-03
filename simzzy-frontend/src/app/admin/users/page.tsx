'use client'

import { useCallback, useEffect, useState } from 'react'
import { Search, UserCheck, UserX, RefreshCw } from 'lucide-react'
import StatusPill from '@/components/admin/StatusPill'
import Drawer from '@/components/admin/Drawer'
import { toast } from '@/store/toast'
import {
  fetchAdminUser, fetchAdminUsers, setAdminUserRole, setAdminUserStatus,
  type AdminUserDetail, type AdminUserListItem,
} from '@/lib/admin-client'

const STATUS_COLOR: Record<string, 'green' | 'red'> = { ACTIVE: 'green', SUSPENDED: 'red' }
const ROLE_COLOR: Record<string, 'green' | 'yellow' | 'purple' | 'gray'> = {
  USER: 'gray', ADMIN: 'yellow', SUPER_ADMIN: 'purple',
}
const STATUSES = ['all', 'ACTIVE', 'SUSPENDED'] as const
const ROLES_FILTER = ['all', 'USER', 'ADMIN', 'SUPER_ADMIN'] as const
const ROLES_EDIT: Array<'USER' | 'ADMIN' | 'SUPER_ADMIN'> = ['USER', 'ADMIN', 'SUPER_ADMIN']

async function jsonFetch<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: 'no-store' })
  if (!r.ok) throw new Error((await r.json()).error ?? `HTTP ${r.status}`)
  return r.json() as Promise<T>
}

export default function AdminUsersPage() {
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('all')
  const [role, setRole] = useState<(typeof ROLES_FILTER)[number]>('all')
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState<AdminUserListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Resolve session role from /api/auth/session so we can hide SUPER_ADMIN
  // controls for non-super admins (server still enforces it).
  const [myRole, setMyRole] = useState<string | null>(null)
  useEffect(() => {
    jsonFetch<{ user?: { role?: string } }>('/api/auth/session')
      .then((s) => setMyRole(s.user?.role ?? null))
      .catch(() => setMyRole(null))
  }, [])

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selected, setSelected] = useState<AdminUserDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setUsers(await fetchAdminUsers({
        q: search.trim() || undefined,
        status: status === 'all' ? undefined : status,
        role: role === 'all' ? undefined : role,
      }))
    } catch (e) {
      setError((e as Error).message ?? 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [search, status, role])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!selectedId) { setSelected(null); return }
    let active = true
    setDetailLoading(true)
    fetchAdminUser(selectedId)
      .then((u) => { if (active) setSelected(u) })
      .catch((e) => active && toast.error('Failed to load user', (e as Error).message))
      .finally(() => active && setDetailLoading(false))
    return () => { active = false }
  }, [selectedId])

  async function toggleSuspend(user: AdminUserListItem) {
    const next = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
    try {
      await setAdminUserStatus(user.id, next)
      toast.success(`User ${next === 'SUSPENDED' ? 'suspended' : 'activated'}`)
      load()
      if (selectedId === user.id) setSelectedId(user.id) // trigger re-fetch
    } catch (e) {
      toast.error('Update failed', (e as Error).message)
    }
  }

  async function changeRole(user: AdminUserListItem | AdminUserDetail, role: 'USER' | 'ADMIN' | 'SUPER_ADMIN') {
    try {
      await setAdminUserRole(user.id, role)
      toast.success(`Role → ${role}`)
      load()
      if (selectedId === user.id) {
        setSelected(await fetchAdminUser(user.id))
      }
    } catch (e) {
      toast.error('Role change failed', (e as Error).message)
    }
  }

  const canEditRoles = myRole === 'SUPER_ADMIN'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="font-mono text-[10px] font-bold tracking-[2px] uppercase text-accent-pink mb-2">People</p>
          <h1 className="text-2xl md:text-[28px] font-extrabold tracking-tight">Users</h1>
          <p className="text-[13px] text-muted mt-1">{users.length} matching this view</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-secondary text-[12px] hover:text-primary">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="sticky top-16 z-10 bg-card/80 backdrop-blur-md border border-border rounded-2xl p-3 flex flex-wrap items-center gap-3">
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}
          className="bg-mid border border-border rounded-lg px-3 py-2 text-[12px] text-primary focus:outline-none focus:border-border-hover">
          {STATUSES.map((s) => <option key={s} value={s}>{s === 'all' ? 'All status' : s.toLowerCase()}</option>)}
        </select>
        <select value={role} onChange={(e) => setRole(e.target.value as typeof role)}
          className="bg-mid border border-border rounded-lg px-3 py-2 text-[12px] text-primary focus:outline-none focus:border-border-hover">
          {ROLES_FILTER.map((r) => <option key={r} value={r}>{r === 'all' ? 'All roles' : r.toLowerCase()}</option>)}
        </select>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Email or name"
            className="w-full pl-9 pr-3 py-2 bg-mid border border-border rounded-lg text-[12px] text-primary placeholder:text-muted focus:outline-none focus:border-border-hover" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {error && (
          <div className="px-5 py-3 border-b border-border bg-[rgba(255,45,120,0.06)] text-[12px] text-accent-pink">{error}</div>
        )}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-muted font-mono uppercase tracking-widest text-[10px] border-b border-border">
                <th className="px-5 py-3 font-semibold">User</th>
                <th className="px-5 py-3 font-semibold">Role</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold text-right">Orders</th>
                <th className="px-5 py-3 font-semibold text-right">Tickets</th>
                <th className="px-5 py-3 font-semibold">Joined</th>
                <th className="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && users.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-muted">Loading…</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-muted">No users match.</td></tr>
              ) : users.map((u) => (
                <tr key={u.id} onClick={() => setSelectedId(u.id)}
                  className="border-b border-border last:border-b-0 hover:bg-card-hover transition-colors cursor-pointer">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-primary">{u.name ?? '—'}</p>
                    <p className="text-muted text-[11px]">{u.email}</p>
                  </td>
                  <td className="px-5 py-3"><StatusPill color={ROLE_COLOR[u.role] ?? 'gray'}>{u.role.toLowerCase()}</StatusPill></td>
                  <td className="px-5 py-3"><StatusPill color={STATUS_COLOR[u.status]}>{u.status.toLowerCase()}</StatusPill></td>
                  <td className="px-5 py-3 text-right font-mono text-secondary">{u.orderCount}</td>
                  <td className="px-5 py-3 text-right font-mono text-secondary">{u.ticketCount}</td>
                  <td className="px-5 py-3 text-muted font-mono text-[11px]">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button onClick={(e) => { e.stopPropagation(); toggleSuspend(u) }}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-muted hover:bg-card-hover hover:text-primary transition-all"
                        title={u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}>
                        {u.status === 'ACTIVE' ? <UserX size={13} /> : <UserCheck size={13} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="md:hidden divide-y divide-border">
          {users.map((u) => (
            <button key={u.id} onClick={() => setSelectedId(u.id)} className="w-full text-left p-4 hover:bg-card-hover transition-colors">
              <p className="font-semibold text-[13px] truncate">{u.name ?? u.email}</p>
              <p className="text-muted text-[11px] truncate">{u.email}</p>
              <div className="flex gap-2 mt-1">
                <StatusPill color={ROLE_COLOR[u.role] ?? 'gray'}>{u.role.toLowerCase()}</StatusPill>
                <StatusPill color={STATUS_COLOR[u.status]}>{u.status.toLowerCase()}</StatusPill>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Drawer */}
      <Drawer
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        title={selected ? selected.name ?? selected.email : ''}
        width="500px"
      >
        {detailLoading ? (
          <div className="flex justify-center py-10">
            <span className="w-7 h-7 rounded-full border-2 border-accent-purple/30 border-t-accent-purple animate-spin" />
          </div>
        ) : !selected ? null : (
          <div className="flex flex-col gap-5 text-[13px]">
            <div className="flex items-center gap-2">
              <StatusPill color={ROLE_COLOR[selected.role] ?? 'gray'}>{selected.role.toLowerCase()}</StatusPill>
              <StatusPill color={STATUS_COLOR[selected.status]}>{selected.status.toLowerCase()}</StatusPill>
            </div>

            <section>
              <p className="font-mono text-[10px] font-bold tracking-[2px] uppercase text-accent-pink mb-2">Contact</p>
              <div className="bg-card border border-border rounded-xl p-4 space-y-1">
                <p className="font-semibold">{selected.email}</p>
                {selected.phone && <p className="text-muted text-[12px]">{selected.phone}</p>}
                {selected.countryCode && <p className="text-muted text-[12px]">Country: {selected.countryCode}</p>}
                {selected.timezone && <p className="text-muted text-[12px]">TZ: {selected.timezone}</p>}
                <p className="text-[11px] text-muted font-mono mt-1">
                  Joined {new Date(selected.createdAt).toLocaleString()}
                  {selected.lastLoginAt && ` · last login ${new Date(selected.lastLoginAt).toLocaleString()}`}
                </p>
              </div>
            </section>

            <section>
              <p className="font-mono text-[10px] font-bold tracking-[2px] uppercase text-accent-pink mb-2">Recent orders</p>
              <div className="bg-card border border-border rounded-xl p-4">
                {selected.recentOrders.length === 0 ? (
                  <p className="text-muted text-[12px]">No orders yet.</p>
                ) : selected.recentOrders.map((o) => (
                  <div key={o.id} className="flex justify-between py-1.5 border-b border-border last:border-none">
                    <span className="text-secondary font-mono text-[11px]">{o.orderNumber}</span>
                    <span className="text-[12px]">${o.usdTotal.toFixed(2)} · <span className="text-muted">{o.status}</span></span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <p className="font-mono text-[10px] font-bold tracking-[2px] uppercase text-accent-pink mb-2">Recent tickets</p>
              <div className="bg-card border border-border rounded-xl p-4">
                {selected.recentTickets.length === 0 ? (
                  <p className="text-muted text-[12px]">No tickets yet.</p>
                ) : selected.recentTickets.map((t) => (
                  <div key={t.id} className="flex justify-between py-1.5 border-b border-border last:border-none">
                    <span className="text-secondary truncate max-w-[60%]">{t.subject}</span>
                    <span className="text-[11px] text-muted">{t.status.toLowerCase()}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <p className="font-mono text-[10px] font-bold tracking-[2px] uppercase text-accent-pink mb-2">Actions</p>
              <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
                <button
                  onClick={() => toggleSuspend(selected)}
                  className="px-4 py-2.5 rounded-lg border border-border text-secondary text-[12px] font-bold hover:bg-card-hover hover:text-primary transition-all inline-flex items-center justify-center gap-2"
                >
                  {selected.status === 'ACTIVE' ? <><UserX size={13} /> Suspend account</> : <><UserCheck size={13} /> Activate account</>}
                </button>
                {canEditRoles ? (
                  <div>
                    <p className="text-[11px] text-muted mb-1.5">Role</p>
                    <div className="flex gap-2">
                      {ROLES_EDIT.map((r) => (
                        <button key={r}
                          disabled={r === selected.role}
                          onClick={() => changeRole(selected, r)}
                          className={`flex-1 px-3 py-2 rounded-md border text-[11px] font-mono ${
                            r === selected.role
                              ? 'border-accent-purple bg-accent-purple/[0.1] text-accent-purple cursor-default'
                              : 'border-border text-secondary hover:bg-card-hover hover:text-primary'
                          }`}
                        >
                          {r.toLowerCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted text-center">Role changes require SUPER_ADMIN.</p>
                )}
              </div>
            </section>
          </div>
        )}
      </Drawer>
    </div>
  )
}
