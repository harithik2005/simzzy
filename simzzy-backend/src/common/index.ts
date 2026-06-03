/**
 * Simzzy backend — common module barrel.
 * Reference data + lookup services shared across modules (countries, regions).
 */
export { countries, findCountryByName } from './countries-data'
export type { CountryRef } from './countries-data'

export { listCountries, getCountryByCode } from './countries'
export type { CountryListItem, CountryListFilters } from './countries'

export { listRegions } from './regions'
export type { RegionListItem } from './regions'
