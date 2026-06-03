'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import {
  AuthCard,
  Field,
  SubmitButton,
} from '@/components/auth/AuthForm'

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [sent, setSent] = useState(false)

  const formValid = isValidEmail(email)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formValid) return
    setSent(true)
  }

  if (sent) {
    return (
      <div
        className="relative w-full max-w-[420px] bg-card border border-border rounded-[14px] p-8 overflow-hidden text-center"
        style={{ animation: 'fadeUp 0.5s ease both' }}
      >
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-btn" />

        <div
          className="w-16 h-16 mx-auto mb-5 rounded-full flex items-center justify-center text-[28px]"
          style={{
            background: 'rgba(34,197,94,0.12)',
            border: '2px solid rgba(34,197,94,0.3)',
            animation: 'checkPop 0.5s ease 0.1s both',
          }}
        >
          ✓
        </div>

        <h1
          className="text-[22px] font-extrabold tracking-[-0.5px] mb-2"
          style={{
            background: 'linear-gradient(180deg, #fff 0%, #c8b0e8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Reset link sent
        </h1>
        <p className="text-[13px] text-secondary mb-1">
          We&apos;ve sent a reset link to
        </p>
        <p className="text-[14px] font-semibold text-accent-green mb-6 break-all">
          {email}
        </p>

        <div
          className="rounded-[14px] p-4 mb-6 text-left"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <p className="text-[12px] text-secondary leading-relaxed">
            <strong className="text-primary">Check your inbox</strong> — the link will expire in 30 minutes.
            Didn&apos;t get it? Check your spam folder or{' '}
            <button
              type="button"
              onClick={() => setSent(false)}
              className="text-accent-pink font-semibold hover:underline"
            >
              try a different email
            </button>
            .
          </p>
        </div>

        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-[13px] text-secondary hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sign In
        </Link>
      </div>
    )
  }

  return (
    <AuthCard
      eyebrow="Reset password"
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a reset link"
    >
      <form onSubmit={handleSubmit} noValidate>
        <Field
          label="Email address"
          type="email"
          value={email}
          onChange={(v) => { setEmail(v); setEmailError('') }}
          onBlur={() => setEmailError(email && !isValidEmail(email) ? 'Please enter a valid email address' : '')}
          placeholder="you@email.com"
          autoComplete="email"
          error={emailError}
        />

        <SubmitButton disabled={!formValid}>Send Reset Link</SubmitButton>

        <p className="text-center mt-5">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-[13px] text-secondary hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </p>
      </form>
    </AuthCard>
  )
}
