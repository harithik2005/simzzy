'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  AuthCard,
  Field,
  PasswordField,
  SubmitButton,
  FormError,
} from '@/components/auth/AuthForm'
import { signIn } from 'next-auth/react'
import { toast } from '@/store/toast'

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

export default function SignupPage() {
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [agreed, setAgreed] = useState(false)

  const [nameError, setNameError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [confirmError, setConfirmError] = useState('')
  const [formError, setFormError] = useState('')

  const formValid =
    name.trim().length >= 2 &&
    isValidEmail(email) &&
    password.length >= 8 &&
    confirm === password &&
    agreed

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Guard against double submission and invalid state.
    if (!formValid || loading) return
    setFormError('')
    setLoading(true)

    try {
      // 1. Create the account.
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email, password }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const msg = data?.error ?? 'Could not create your account. Please try again.'
        // Surface a known conflict on the email field too.
        if (res.status === 409) setEmailError('An account with this email already exists')
        setFormError(msg)
        toast.error('Could not create account', msg)
        return
      }

      // 2. Account created — sign in immediately.
      const signInRes = await signIn('credentials', { email, password, redirect: false })
      if (signInRes?.error) {
        // Account exists but auto sign-in failed — send them to login.
        toast.success('Account created', 'Please sign in to continue')
        window.location.assign('/login')
        return
      }

      // 3. Success — full reload so the session + navbar are correct immediately.
      toast.success('Account created', 'Welcome to Simzzy!')
      window.location.assign('/dashboard')
    } catch {
      // Network/timeout/unexpected error — never leave the button stuck.
      const msg = 'Network error — please check your connection and try again.'
      setFormError(msg)
      toast.error('Something went wrong', msg)
    } finally {
      // Reset loading unless we've already navigated away on success.
      setLoading(false)
    }
  }

  return (
    <AuthCard
      eyebrow="Create account"
      title="Get started for free"
      subtitle="Join 500K+ travelers worldwide"
    >
      <form onSubmit={handleSubmit} noValidate aria-busy={loading}>
        <FormError message={formError} />

        <Field
          label="Full name"
          value={name}
          onChange={(v) => { setName(v); setNameError(''); setFormError('') }}
          onBlur={() => setNameError(name && name.trim().length < 2 ? 'Please enter your full name' : '')}
          placeholder="John Doe"
          autoComplete="name"
          error={nameError}
          required
          disabled={loading}
        />

        <Field
          label="Email address"
          type="email"
          value={email}
          onChange={(v) => { setEmail(v); setEmailError(''); setFormError('') }}
          onBlur={() => setEmailError(email && !isValidEmail(email) ? 'Please enter a valid email address' : '')}
          placeholder="you@email.com"
          autoComplete="email"
          error={emailError}
          required
          disabled={loading}
        />

        <PasswordField
          label="Password"
          value={password}
          onChange={(v) => {
            setPassword(v)
            setPasswordError('')
            setFormError('')
            if (confirm && v !== confirm) setConfirmError('Passwords do not match')
            else setConfirmError('')
          }}
          onBlur={() => setPasswordError(password && password.length < 8 ? 'Password must be at least 8 characters' : '')}
          autoComplete="new-password"
          error={passwordError}
          showStrength
          required
          disabled={loading}
        />

        <PasswordField
          label="Confirm password"
          value={confirm}
          onChange={(v) => { setConfirm(v); setConfirmError(v && v !== password ? 'Passwords do not match' : '') }}
          onBlur={() => setConfirmError(confirm && confirm !== password ? 'Passwords do not match' : '')}
          autoComplete="new-password"
          error={confirmError}
          required
          disabled={loading}
        />

        {/* Terms */}
        <label className="flex items-start gap-2 mb-5 cursor-pointer select-none">
          <span
            onClick={() => setAgreed((a) => !a)}
            className={
              'w-4 h-4 rounded flex items-center justify-center text-[10px] transition-all duration-200 flex-shrink-0 mt-0.5 ' +
              (agreed
                ? 'bg-accent-purple text-white'
                : 'border border-border-hover bg-card')
            }
            style={{ border: agreed ? undefined : '1.5px solid rgba(255,255,255,0.15)' }}
          >
            {agreed ? '✓' : ''}
          </span>
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="sr-only"
          />
          <span className="text-[12px] text-secondary leading-relaxed">
            I agree to the{' '}
            <Link href="/terms" className="text-accent-pink font-semibold hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-accent-pink font-semibold hover:underline">
              Privacy Policy
            </Link>
          </span>
        </label>

        <SubmitButton disabled={!formValid || loading} loading={loading}>
          {loading ? 'Creating account…' : 'Create Account'}
        </SubmitButton>

        <p className="text-center text-[12px] text-muted mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-accent-pink font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthCard>
  )
}
