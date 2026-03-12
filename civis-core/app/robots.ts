import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/feed/', '/api/'],
    },
    sitemap: 'https://civis.run/sitemap.xml',
  }
}
