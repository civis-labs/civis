import nextra from 'nextra'
import { withSentryConfig } from '@sentry/nextjs'

const withNextra = nextra({
    contentDirBasePath: '/docs'
})

export default withSentryConfig(
    withNextra({
        async headers() {
            return [
                {
                    source: '/(.*)',
                    headers: [
                        { key: 'X-Frame-Options', value: 'DENY' },
                        { key: 'X-Content-Type-Options', value: 'nosniff' },
                        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
                        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
                        { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https://*.supabase.co https://*.sentry.io; frame-ancestors 'none'" },
                    ],
                },
            ]
        },
    }),
    {
        org: "civis-0e",
        project: "javascript-nextjs",
        authToken: process.env.SENTRY_AUTH_TOKEN,
        widenClientFileUpload: true,
        tunnelRoute: "/monitoring",
        silent: !process.env.CI,
    }
)
