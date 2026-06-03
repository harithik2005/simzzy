import type { MetadataRoute } from 'next'

const BASE_URL = 'https://simzzy.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const routes: { path: string; priority: number; changeFrequency: 'daily' | 'weekly' | 'monthly' }[] = [
    { path: '',         priority: 1.0, changeFrequency: 'daily' },
    { path: '/browse',  priority: 0.9, changeFrequency: 'daily' },
    { path: '/support', priority: 0.6, changeFrequency: 'weekly' },
    { path: '/login',   priority: 0.4, changeFrequency: 'monthly' },
    { path: '/signup',  priority: 0.4, changeFrequency: 'monthly' },
  ]

  return routes.map((r) => ({
    url: `${BASE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }))
}
