/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['localhost'],
    formats: ['image/avif', 'image/webp']
  },
  experimental: {
    // Improves tree-shaking for barrel-style packages so a route only ships
    // the specific icons/components it imports instead of the whole package.
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns']
  },
  async rewrites() {
    const rawApiUrl = process.env.NEXT_PUBLIC_JAVA_API_URL
    if (!rawApiUrl) {
      console.warn('[next.config.js] Warning: NEXT_PUBLIC_JAVA_API_URL is not defined. API rewrites disabled.')
      return []
    }
    const apiUrl = rawApiUrl.replace(/\/+$/, '')
    const destination = apiUrl.endsWith('/api')
      ? `${apiUrl}/:path*`
      : `${apiUrl}/api/:path*`

    return [
      {
        source: '/api/:path*',
        destination,
      },
    ]
  }
}

module.exports = nextConfig
