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

export function Field({
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  autoComplete,
}: {
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  placeholder?: string
  error?: string
  autoComplete?: string
}) {
  return (
    <div className="mb-4">
      <label className="block text-[12px] font-semibold text-secondary mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={cn(
          'w-full px-4 py-3 text-sm rounded-[14px] outline-none transition-all duration-300',
          'bg-white/[0.04] text-primary placeholder:text-muted',
          error
            ? 'border border-accent-pink focus:border-accent-pink'
            : 'border border-border focus:border-accent-purple focus:bg-white/[0.06] focus:shadow-[0_0_20px_rgba(147,51,234,0.1)]',
        )}
      />
      {error && <p className="text-[11px] text-accent-pink mt-1">{error}</p>}
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
}: {
  label: string
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  placeholder?: string
  error?: string
  autoComplete?: string
  showStrength?: boolean
}) {
  const [show, setShow] = useState(false)
  const strength = scorePassword(value)

  return (
    <div className="mb-4">
      <label className="block text-[12px] font-semibold text-secondary mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={cn(
            'w-full pl-4 pr-11 py-3 text-sm rounded-[14px] outline-none transition-all duration-300',
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

      {error && <p className="text-[11px] text-accent-pink mt-1">{error}</p>}
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
  children,
}: {
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className={cn(
        'w-full py-3.5 rounded-[14px] bg-gradient-btn text-white text-[14px] font-bold transition-all duration-300',
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:opacity-90 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(255,45,120,0.25)]',
      )}
    >
      {children}
    </button>
  )
}

/* ─── Divider + social buttons ───────────────────────────────────────────── */

export function SocialDivider() {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-border" />
      <span className="text-[11px] font-mono uppercase tracking-[1.5px] text-muted">
        or continue with
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}

export function SocialButtons() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        className="flex items-center justify-center gap-2 py-3 rounded-[14px] border border-border bg-card text-secondary text-[13px] font-semibold transition-all duration-200 hover:bg-card-hover hover:text-primary hover:border-border-hover"
      >
        <GoogleIcon />
        Google
      </button>
      <button
        type="button"
        className="flex items-center justify-center gap-2 py-3 rounded-[14px] border border-border bg-card text-secondary text-[13px] font-semibold transition-all duration-200 hover:bg-card-hover hover:text-primary hover:border-border-hover"
      >
        <AppleIcon />
        Apple
      </button>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.48 12c0-.73.13-1.44.36-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.77.42 3.44 1.18 4.93l3.66-2.83z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A10.99 10.99 0 0 0 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.05 12.04c-.03-3.06 2.5-4.53 2.61-4.6-1.42-2.08-3.64-2.37-4.43-2.4-1.89-.19-3.69 1.11-4.65 1.11-.97 0-2.44-1.08-4.01-1.05-2.07.03-3.97 1.2-5.04 3.05-2.15 3.72-.55 9.23 1.55 12.26 1.02 1.48 2.24 3.14 3.83 3.08 1.54-.06 2.12-1 3.99-1 1.86 0 2.39 1 4.02.97 1.66-.03 2.7-1.5 3.71-2.99 1.18-1.71 1.66-3.39 1.68-3.47-.04-.02-3.22-1.23-3.26-4.96zm-3.05-9.1C14.85 1.95 15.43.66 15.27-.61c-1.07.04-2.36.71-3.24 1.72-.78.9-1.47 2.34-1.29 3.57 1.2.09 2.43-.61 3.26-1.74z" />
    </svg>
  )
}
