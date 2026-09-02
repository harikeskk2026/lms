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
  }
}

module.exports = nextConfig
