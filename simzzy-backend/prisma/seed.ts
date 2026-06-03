/**
 * Simzzy — database seed (idempotent).
 *
 * Safe to run repeatedly: every record is written with `upsert` keyed on its
 * natural unique field (slug / code / key / id), so re-running updates rather
 * than duplicating. Seeds only reference/config data — no orders, users, or
 * catalog plans.
 */
import { PrismaClient, ProviderStatus, SettingType } from '@prisma/client'
import { countries as countryRefs } from '../src/common/countries-data'

const prisma = new PrismaClient()

/* ─── Data ─────────────────────────────────────────────────────────────── */

const esimProviders = [
  { slug: 'tsim', name: 'tSIM', status: ProviderStatus.ACTIVE },
  { slug: 'joytel', name: 'Joytel', status: ProviderStatus.INACTIVE },
  { slug: 'airalo', name: 'Airalo', status: ProviderStatus.INACTIVE },
]

const paymentProviders = [
  { slug: 'dummy', name: 'Dummy Gateway', status: ProviderStatus.ACTIVE, isDefault: true },
  { slug: 'eximpe', name: 'EximPe', status: ProviderStatus.INACTIVE, isDefault: false },
  { slug: 'stripe', name: 'Stripe', status: ProviderStatus.INACTIVE, isDefault: false },
  { slug: 'paypal', name: 'PayPal', status: ProviderStatus.INACTIVE, isDefault: false },
]

const currencies = [
  { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2 },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimals: 2 },
  { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2 },
  { code: 'GBP', name: 'British Pound', symbol: '£', decimals: 2 },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED', decimals: 2 },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimals: 2 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimals: 2 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimals: 0 },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', decimals: 2 },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', decimals: 2 },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', decimals: 2 },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', decimals: 0 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimals: 2 },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', decimals: 2 },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', decimals: 2 },
]

const regions = [
  { code: 'global', name: 'Global', sortOrder: 0 },
  { code: 'asia', name: 'Asia', sortOrder: 1 },
  { code: 'europe', name: 'Europe', sortOrder: 2 },
  { code: 'north-america', name: 'North America', sortOrder: 3 },
  { code: 'south-america', name: 'South America', sortOrder: 4 },
  { code: 'africa', name: 'Africa', sortOrder: 5 },
  { code: 'middle-east', name: 'Middle East', sortOrder: 6 },
  { code: 'oceania', name: 'Oceania', sortOrder: 7 },
]

const siteSettings = [
  { key: 'site_name', value: 'Simzzy', type: SettingType.STRING, group: 'general', isPublic: true, description: 'Public site name' },
  { key: 'support_email', value: 'support@simzzy.com', type: SettingType.STRING, group: 'general', isPublic: true, description: 'Address shown to customers for help' },
  { key: 'default_currency', value: 'USD', type: SettingType.STRING, group: 'general', isPublic: true, description: 'Fallback display currency' },
  { key: 'maintenance_mode', value: false, type: SettingType.BOOLEAN, group: 'general', isPublic: true, description: 'When true, the storefront shows a maintenance page' },
  { key: 'chatbot_enabled', value: true, type: SettingType.BOOLEAN, group: 'features', isPublic: true, description: 'Toggles the support chat widget' },
  { key: 'show_profit_display', value: true, type: SettingType.BOOLEAN, group: 'features', isPublic: false, description: 'Surface cost, profit and margin columns across the admin panel' },
  { key: 'provider_sandbox_mode', value: true, type: SettingType.BOOLEAN, group: 'integration', isPublic: false, description: 'Route eSIM/payment providers to sandbox endpoints (production toggle)' },
]

/* ─── Seeders ──────────────────────────────────────────────────────────── */

async function seedEsimProviders() {
  for (const p of esimProviders) {
    await prisma.esimProvider.upsert({
      where: { slug: p.slug },
      update: { name: p.name, status: p.status },
      create: p,
    })
  }
  console.log(`  ✓ eSIM providers: ${esimProviders.length}`)
}

async function seedPaymentProviders() {
  for (const p of paymentProviders) {
    await prisma.paymentProvider.upsert({
      where: { slug: p.slug },
      update: { name: p.name, status: p.status, isDefault: p.isDefault },
      create: p,
    })
  }
  console.log(`  ✓ Payment providers: ${paymentProviders.length}`)
}

async function seedCurrencies() {
  for (const c of currencies) {
    await prisma.currency.upsert({
      where: { code: c.code },
      update: { name: c.name, symbol: c.symbol, decimals: c.decimals },
      create: c,
    })
  }
  console.log(`  ✓ Currencies: ${currencies.length}`)
}

async function seedRegions() {
  for (const r of regions) {
    await prisma.region.upsert({
      where: { code: r.code },
      update: { name: r.name, sortOrder: r.sortOrder },
      create: r,
    })
  }
  console.log(`  ✓ Regions: ${regions.length}`)
}

async function seedCountries() {
  // Build region.code → region.id map once (regions must already exist).
  const regionRows = await prisma.region.findMany({ select: { id: true, code: true } })
  const regionByCode = new Map(regionRows.map((r) => [r.code, r.id]))

  let upserted = 0
  for (const c of countryRefs) {
    const regionId = regionByCode.get(c.regionCode)
    if (!regionId) {
      throw new Error(`Country ${c.code} references unknown region "${c.regionCode}"`)
    }
    await prisma.country.upsert({
      where: { code: c.code },
      update: { name: c.name, flag: c.flag, regionId },
      create: { code: c.code, name: c.name, flag: c.flag, regionId },
    })
    upserted++
  }
  console.log(`  ✓ Countries: ${upserted}`)
}

async function seedSiteSettings() {
  for (const s of siteSettings) {
    await prisma.siteSetting.upsert({
      where: { key: s.key },
      update: { value: s.value, type: s.type, group: s.group, isPublic: s.isPublic, description: s.description },
      create: s,
    })
  }
  console.log(`  ✓ Site settings: ${siteSettings.length}`)
}

async function seedGlobalPricingRule() {
  await prisma.pricingGlobalRule.upsert({
    where: { id: 1 },
    update: { profitUsd: 2.0, isActive: true },
    create: { id: 1, singleton: true, profitUsd: 2.0, isActive: true },
  })
  console.log('  ✓ Global pricing rule: 1 (+$2.00)')
}

/* ─── Verification ─────────────────────────────────────────────────────── */

async function reportCounts() {
  // Sequential (not Promise.all) — the Supabase direct connection is IPv6-only
  // and flaky under bursty parallel queries; one-at-a-time is rock solid.
  const providers = await prisma.esimProvider.count()
  const payments = await prisma.paymentProvider.count()
  const curr = await prisma.currency.count()
  const regs = await prisma.region.count()
  const ctrys = await prisma.country.count()
  const settings = await prisma.siteSetting.count()
  const global = await prisma.pricingGlobalRule.count()

  console.log('\n📊 Record counts after seed:')
  console.table({
    esim_providers: providers,
    payment_providers: payments,
    currencies: curr,
    regions: regs,
    countries: ctrys,
    site_settings: settings,
    pricing_global_rules: global,
  })
}

/* ─── Main ─────────────────────────────────────────────────────────────── */

async function main() {
  console.log('🌱 Seeding Simzzy reference data (idempotent)...\n')
  await seedEsimProviders()
  await seedPaymentProviders()
  await seedCurrencies()
  await seedRegions()
  await seedCountries()
  await seedSiteSettings()
  await seedGlobalPricingRule()
  await reportCounts()
  console.log('\n✅ Seed complete.')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
