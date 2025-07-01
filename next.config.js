/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    deviceSizes: [240, 320, 480, 640, 750, 828, 1080],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['@heroicons/react', '@radix-ui/react-icons'],
  },
}

module.exports = nextConfig 