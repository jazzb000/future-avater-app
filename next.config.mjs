/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // 이미지 최적화 활성화 (성능 향상)
    unoptimized: false,
    // 갤러리 최적화를 위한 device sizes
    deviceSizes: [480, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // 포맷 최적화
    formats: ['image/webp', 'image/avif'],
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
    // 캐시 최적화
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7일
  },
  // 성능 최적화 설정 (빌드 오류 방지)
  experimental: {
    // optimizeCss: true, // 빌드 오류 원인이므로 비활성화
    optimizeServerReact: true, // React 서버 최적화만 유지
  },
  // 압축 설정
  compress: true,
  // 정적 에셋 최적화
  swcMinify: true,
  // 트리 쉐이킹 최적화
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{member}}',
    },
  },
  // 빌드 최적화
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
}

export default nextConfig
