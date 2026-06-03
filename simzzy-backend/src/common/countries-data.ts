/**
 * Country reference data for the Simzzy catalog.
 *
 * `code` is ISO 3166-1 alpha-2. `regionCode` matches the seeded `regions.code`
 * (see prisma/seed.ts). The list covers every destination referenced by mock
 * plans so the import can resolve plan_destinations by name.
 */
export type CountryRef = {
  name: string
  code: string
  flag: string
  regionCode: 'asia' | 'europe' | 'north-america' | 'south-america' | 'africa' | 'middle-east' | 'oceania'
  aliases?: string[]
}

export const countries: CountryRef[] = [
  /* ─── Asia ──────────────────────────────────────────────────────────────── */
  { name: 'Japan',        code: 'JP', flag: '🇯🇵', regionCode: 'asia' },
  { name: 'South Korea',  code: 'KR', flag: '🇰🇷', regionCode: 'asia', aliases: ['Korea'] },
  { name: 'Thailand',     code: 'TH', flag: '🇹🇭', regionCode: 'asia' },
  { name: 'India',        code: 'IN', flag: '🇮🇳', regionCode: 'asia' },
  { name: 'Singapore',    code: 'SG', flag: '🇸🇬', regionCode: 'asia' },
  { name: 'Malaysia',     code: 'MY', flag: '🇲🇾', regionCode: 'asia' },
  { name: 'Indonesia',    code: 'ID', flag: '🇮🇩', regionCode: 'asia' },
  { name: 'Vietnam',      code: 'VN', flag: '🇻🇳', regionCode: 'asia' },
  { name: 'Philippines',  code: 'PH', flag: '🇵🇭', regionCode: 'asia' },
  { name: 'Hong Kong',    code: 'HK', flag: '🇭🇰', regionCode: 'asia' },
  { name: 'Taiwan',       code: 'TW', flag: '🇹🇼', regionCode: 'asia' },
  { name: 'China',        code: 'CN', flag: '🇨🇳', regionCode: 'asia' },

  /* ─── Europe ────────────────────────────────────────────────────────────── */
  { name: 'United Kingdom', code: 'GB', flag: '🇬🇧', regionCode: 'europe', aliases: ['UK', 'Britain'] },
  { name: 'France',        code: 'FR', flag: '🇫🇷', regionCode: 'europe' },
  { name: 'Germany',       code: 'DE', flag: '🇩🇪', regionCode: 'europe' },
  { name: 'Italy',         code: 'IT', flag: '🇮🇹', regionCode: 'europe' },
  { name: 'Spain',         code: 'ES', flag: '🇪🇸', regionCode: 'europe' },
  { name: 'Portugal',      code: 'PT', flag: '🇵🇹', regionCode: 'europe' },
  { name: 'Netherlands',   code: 'NL', flag: '🇳🇱', regionCode: 'europe' },
  { name: 'Greece',        code: 'GR', flag: '🇬🇷', regionCode: 'europe' },
  { name: 'Austria',       code: 'AT', flag: '🇦🇹', regionCode: 'europe' },
  { name: 'Switzerland',   code: 'CH', flag: '🇨🇭', regionCode: 'europe' },
  { name: 'Turkey',        code: 'TR', flag: '🇹🇷', regionCode: 'europe' },

  /* ─── Americas ──────────────────────────────────────────────────────────── */
  { name: 'United States', code: 'US', flag: '🇺🇸', regionCode: 'north-america', aliases: ['USA', 'US', 'America'] },
  { name: 'Canada',        code: 'CA', flag: '🇨🇦', regionCode: 'north-america' },
  { name: 'Mexico',        code: 'MX', flag: '🇲🇽', regionCode: 'north-america' },
  { name: 'Brazil',        code: 'BR', flag: '🇧🇷', regionCode: 'south-america' },
  { name: 'Argentina',     code: 'AR', flag: '🇦🇷', regionCode: 'south-america' },
  { name: 'Chile',         code: 'CL', flag: '🇨🇱', regionCode: 'south-america' },
  { name: 'Colombia',      code: 'CO', flag: '🇨🇴', regionCode: 'south-america' },
  { name: 'Peru',          code: 'PE', flag: '🇵🇪', regionCode: 'south-america' },

  /* ─── Middle East ───────────────────────────────────────────────────────── */
  { name: 'United Arab Emirates', code: 'AE', flag: '🇦🇪', regionCode: 'middle-east', aliases: ['UAE'] },
  { name: 'Saudi Arabia', code: 'SA', flag: '🇸🇦', regionCode: 'middle-east' },
  { name: 'Israel',       code: 'IL', flag: '🇮🇱', regionCode: 'middle-east' },
  { name: 'Qatar',        code: 'QA', flag: '🇶🇦', regionCode: 'middle-east' },

  /* ─── Africa ────────────────────────────────────────────────────────────── */
  { name: 'Egypt',        code: 'EG', flag: '🇪🇬', regionCode: 'africa' },
  { name: 'South Africa', code: 'ZA', flag: '🇿🇦', regionCode: 'africa' },
  { name: 'Morocco',      code: 'MA', flag: '🇲🇦', regionCode: 'africa' },
  { name: 'Kenya',        code: 'KE', flag: '🇰🇪', regionCode: 'africa' },

  /* ─── Oceania ───────────────────────────────────────────────────────────── */
  { name: 'Australia',    code: 'AU', flag: '🇦🇺', regionCode: 'oceania' },
  { name: 'New Zealand',  code: 'NZ', flag: '🇳🇿', regionCode: 'oceania' },
  { name: 'Fiji',         code: 'FJ', flag: '🇫🇯', regionCode: 'oceania' },
]

/** Lookup by name OR alias (case-insensitive). Returns the canonical record. */
const NAME_INDEX: Map<string, CountryRef> = new Map()
for (const c of countries) {
  NAME_INDEX.set(c.name.toLowerCase(), c)
  for (const alias of c.aliases ?? []) NAME_INDEX.set(alias.toLowerCase(), c)
}

export function findCountryByName(name: string): CountryRef | undefined {
  return NAME_INDEX.get(name.trim().toLowerCase())
}
