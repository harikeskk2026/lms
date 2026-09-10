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
    const rawApiUrl = process.env.NEXT_PUBLIC_JAVA_API_URL || 'http://localhost:7000/api'
    const apiUrl = rawApiUrl.replace(/\/+$/, '')
    const apiBase = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl}/api`
    // Derive the origin (strip /api suffix) for file serving
    const origin = apiBase.replace(/\/api$/, '')

    return [
      {
        // Proxy uploaded files so they are served same-origin (avoids cross-origin
        // iframe restrictions that prevent inline PDF/Office preview)
        source: '/uploads/:path*',
        destination: `${origin}/uploads/:path*`,
      },
      {
        source: '/api/:path*',
        destination: `${apiBase}/:path*`,
      },
    ]
  },
}

module.exports = nextConfig

