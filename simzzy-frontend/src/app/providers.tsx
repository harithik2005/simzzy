'use client'

import { SessionProvider } from 'next-auth/react'
import { CurrencyProvider } from '@/context/currency'
import { Toaster } from '@/components/ui/Toaster'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CurrencyProvider>
        {children}
        <Toaster />
      </CurrencyProvider>
    </SessionProvider>
  )
}
