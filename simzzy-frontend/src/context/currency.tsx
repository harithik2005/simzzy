'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  BASE_CURRENCY,
  currencySymbol,
  fetchRate,
  fetchVisitorCurrency,
  formatLocal,
  readCache,
  writeCache,
} from '@/lib/currency'

type CurrencyContextValue = {
  code: string
  symbol: string
  rate: number
  /** false until the first rate resolves (drives skeleton/USD-fallback UI). */
  ready: boolean
  convert: (usd: number) => number
  format: (usd: number) => string
  setCurrency: (code: string) => void
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null)

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [code, setCode] = useState(BASE_CURRENCY)
  const [rate, setRate] = useState(1)
  const [ready, setReady] = useState(false)

  // Initial detection + rate fetch, with 1-hour localStorage cache and USD fallback.
  useEffect(() => {
    const cached = readCache()
    if (cached) {
      // Hydration-safe: server renders USD, so cached currency is applied only after mount.
      /* eslint-disable react-hooks/set-state-in-effect */
      setCode(cached.code)
      setRate(cached.rate)
      setReady(true)
      /* eslint-enable react-hooks/set-state-in-effect */
      return
    }

    const controller = new AbortController()
    ;(async () => {
      // One round-trip to our backend; it handles geo + rate together.
      const { code: detected, rate: r } = await fetchVisitorCurrency(controller.signal)
      setCode(detected)
      setRate(r)
      setReady(true)
      writeCache({ code: detected, rate: r, fetchedAt: Date.now() })
    })()

    return () => controller.abort()
  }, [])

  // Manual override (e.g. footer/currency switcher) — refetches the rate.
  const setCurrency = useCallback((next: string) => {
    setReady(false)
    const controller = new AbortController()
    ;(async () => {
      const r = await fetchRate(next, controller.signal)
      setCode(next)
      setRate(r)
      setReady(true)
      writeCache({ code: next, rate: r, fetchedAt: Date.now() })
    })()
  }, [])

  const convert = useCallback((usd: number) => usd * rate, [rate])
  const format = useCallback((usd: number) => formatLocal(usd * rate, code), [rate, code])

  const value: CurrencyContextValue = {
    code,
    symbol: currencySymbol(code),
    rate,
    ready,
    convert,
    format,
    setCurrency,
  }

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext)
  if (!ctx) {
    throw new Error('useCurrency must be used within a <CurrencyProvider>')
  }
  return ctx
}
