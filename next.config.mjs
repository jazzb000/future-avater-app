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
    // 모바일 우선 최적화를 위한 device sizes (더 작은 크기 우선)
    deviceSizes: [320, 420, 640, 750, 828, 1080],
    // 작은 이미지 사이즈 더 세분화
    imageSizes: [16, 32, 48, 64, 96, 128, 192, 256],
    // 모바일에 최적화된 포맷 (WebP 우선, AVIF는 지원 기기만)
    formats: ['image/webp'],
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
    // 모바일 캐시 최적화 (더 짧은 캐시)
    minimumCacheTTL: 60 * 60 * 24 * 3, // 3일로 단축
  },
  // 성능 최적화 설정 (빌드 오류 방지)
  experimental: {
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
