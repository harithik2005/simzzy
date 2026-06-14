'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import {
  AuthCard,
  Field,
  PasswordField,
  SubmitButton,
  FormError,
} from '@/components/auth/AuthForm'
import { toast } from '@/store/toast'

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

function LoginForm() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [formError, setFormError] = useState('')
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)

  const formValid = isValidEmail(email) && password.length >= 8

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formValid || loading) return
    setFormError('')
    setLoading(true)
    try {
      const res = await signIn('credentials', { email, password, redirect: false })
      if (res?.error) {
        const msg = 'Invalid email or password, or your account is suspended.'
        setFormError(msg)
        toast.error('Sign in failed', msg)
        return
      }
      // Full reload so the session + role-based navbar (Admin Panel) are correct immediately.
      window.location.assign(callbackUrl)
    } catch {
      const msg = 'Network error — please check your connection and try again.'
      setFormError(msg)
      toast.error('Something went wrong', msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard
      eyebrow="Welcome back"
      title="Sign in to your account"
      subtitle="Sign in to your Simzzy account"
    >
      <form onSubmit={handleSubmit} noValidate aria-busy={loading}>
        <FormError message={formError} />

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
          onChange={(v) => { setPassword(v); setPasswordError(''); setFormError('') }}
          onBlur={() => setPasswordError(password && password.length < 8 ? 'Password must be at least 8 characters' : '')}
          autoComplete="current-password"
          error={passwordError}
          required
          disabled={loading}
        />

        {/* Remember + forgot */}
        <div className="flex items-center justify-between mb-5 -mt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span
              onClick={() => setRemember((r) => !r)}
              className={
                'w-4 h-4 rounded flex items-center justify-center text-[10px] transition-all duration-200 flex-shrink-0 ' +
                (remember
                  ? 'bg-accent-purple text-white'
                  : 'border border-border-hover bg-card')
              }
              style={{ border: remember ? undefined : '1.5px solid rgba(255,255,255,0.15)' }}
            >
              {remember ? '✓' : ''}
            </span>
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="sr-only"
            />
            <span className="text-[12px] text-secondary">Remember me</span>
          </label>

          <Link
            href="/forgot-password"
            className="text-[12px] text-accent-pink font-semibold hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <SubmitButton disabled={!formValid || loading} loading={loading}>
          {loading ? 'Signing in…' : 'Sign In'}
        </SubmitButton>

        <p className="text-center text-[12px] text-muted mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-accent-pink font-semibold hover:underline">
            Sign up
          </Link>
        </p>
      </form>
    </AuthCard>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-[420px] h-[400px]" />}>
      <LoginForm />
    </Suspense>
  )
}
