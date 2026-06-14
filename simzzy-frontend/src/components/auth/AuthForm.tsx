'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ─── Card wrapper ───────────────────────────────────────────────────────── */

export function AuthCard({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div
      className="relative w-full max-w-[420px] bg-card border border-border rounded-[14px] p-8 overflow-hidden"
      style={{ animation: 'fadeUp 0.5s ease both' }}
    >
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-btn" />
      <p className="font-mono text-[11px] font-bold tracking-[2px] uppercase text-accent-pink mb-2">
        {eyebrow}
      </p>
      <h1
        className="text-[26px] font-extrabold tracking-[-0.5px] mb-1.5"
        style={{
          background: 'linear-gradient(180deg, #fff 0%, #c8b0e8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        {title}
      </h1>
      <p className="text-[13px] text-secondary mb-6">{subtitle}</p>
      {children}
    </div>
  )
}

/* ─── Standard input field ───────────────────────────────────────────────── */

/** Derive a stable, DOM-safe id from a field label. */
function fieldId(label: string) {
  return 'f-' + label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export function Field({
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  autoComplete,
  required,
  disabled,
  id,
}: {
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  placeholder?: string
  error?: string
  autoComplete?: string
  required?: boolean
  disabled?: boolean
  id?: string
}) {
  const inputId = id ?? fieldId(label)
  const errorId = `${inputId}-error`
  return (
    <div className="mb-4">
      <label htmlFor={inputId} className="block text-[12px] font-semibold text-secondary mb-1.5">
        {label}
      </label>
      <input
        id={inputId}
        name={inputId}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          'w-full px-4 py-3 text-sm rounded-[14px] outline-none transition-all duration-300 disabled:opacity-60',
          'bg-white/[0.04] text-primary placeholder:text-muted',
          error
            ? 'border border-accent-pink focus:border-accent-pink'
            : 'border border-border focus:border-accent-purple focus:bg-white/[0.06] focus:shadow-[0_0_20px_rgba(147,51,234,0.1)]',
        )}
      />
      {error && <p id={errorId} role="alert" className="text-[11px] text-accent-pink mt-1">{error}</p>}
    </div>
  )
}

/* ─── Password field with show/hide toggle ──────────────────────────────── */

export function PasswordField({
  label,
  value,
  onChange,
  onBlur,
  placeholder = '••••••••',
  error,
  autoComplete = 'current-password',
  showStrength = false,
  required,
  disabled,
  id,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  placeholder?: string
  error?: string
  autoComplete?: string
  showStrength?: boolean
  required?: boolean
  disabled?: boolean
  id?: string
}) {
  const [show, setShow] = useState(false)
  const strength = scorePassword(value)
  const inputId = id ?? fieldId(label)
  const errorId = `${inputId}-error`

  return (
    <div className="mb-4">
      <label htmlFor={inputId} className="block text-[12px] font-semibold text-secondary mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          name={inputId}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'w-full pl-4 pr-11 py-3 text-sm rounded-[14px] outline-none transition-all duration-300 disabled:opacity-60',
            'bg-white/[0.04] text-primary placeholder:text-muted',
            error
              ? 'border border-accent-pink focus:border-accent-pink'
              : 'border border-border focus:border-accent-purple focus:bg-white/[0.06] focus:shadow-[0_0_20px_rgba(147,51,234,0.1)]',
          )}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {showStrength && value && (
        <div className="mt-2">
          <div className="flex gap-1.5 mb-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex-1 h-1 rounded-full transition-colors duration-300"
                style={{
                  background:
                    i < strength.level
                      ? strength.color
                      : 'rgba(255,255,255,0.08)',
                }}
              />
            ))}
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.5px]" style={{ color: strength.color }}>
            {strength.label}
          </p>
        </div>
      )}

      {error && <p id={errorId} role="alert" className="text-[11px] text-accent-pink mt-1">{error}</p>}
    </div>
  )
}

function scorePassword(pwd: string): { level: number; label: string; color: string } {
  if (!pwd) return { level: 0, label: '', color: '#7a5ea0' }
  let score = 0
  if (pwd.length >= 8) score++
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++
  if (/\d/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) score++

  if (pwd.length < 8) return { level: 1, label: 'Too short', color: '#ff2d78' }
  if (score === 1) return { level: 1, label: 'Weak', color: '#ff2d78' }
  if (score === 2) return { level: 2, label: 'Medium', color: '#eab308' }
  return { level: 3, label: 'Strong', color: '#22c55e' }
}

/* ─── Gradient submit button ─────────────────────────────────────────────── */

export function SubmitButton({
  disabled,
  loading,
  children,
}: {
  disabled?: boolean
  loading?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      aria-busy={loading || undefined}
      className={cn(
        'w-full py-3.5 rounded-[14px] bg-gradient-btn text-white text-[14px] font-bold transition-all duration-300 inline-flex items-center justify-center gap-2',
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:opacity-90 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(255,45,120,0.25)]',
      )}
    >
      {loading && <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
}

/* ─── Inline form-level error banner ─────────────────────────────────────── */

export function FormError({ message }: { message: string }) {
  if (!message) return null
  return (
    <div
      role="alert"
      className="mb-4 px-4 py-3 rounded-[14px] border border-accent-pink/40 bg-[rgba(255,45,120,0.08)] flex items-start gap-2.5"
      style={{ animation: 'fadeIn 0.2s ease' }}
    >
      <span className="text-accent-pink text-[15px] leading-none mt-0.5" aria-hidden="true">⚠</span>
      <p className="text-[12.5px] text-secondary">{message}</p>
    </div>
  )
}
