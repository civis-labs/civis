import { MetadataRoute } from 'next'
import { getMarketingBaseUrl } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  const marketingBaseUrl = getMarketingBaseUrl();

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/'],
    },
    sitemap: `${marketingBaseUrl}/sitemap.xml`,
    host: marketingBaseUrl,
  }
}
