/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // 개발환경과 빌드환경 모두 고려한 설정
    ...(process.env.NODE_ENV === 'development' 
      ? { unoptimized: true } // 개발환경에서는 빠른 개발을 위해
      : { 
          // 프로덕션에서는 최적화 활성화
          formats: ['image/webp', 'image/avif'],
          minimumCacheTTL: 604800, // 7일 캐시 (더 길게)
        }
    ),
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      }
    ],
  },
}

export default nextConfig
