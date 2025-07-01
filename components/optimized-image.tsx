import NextImage from 'next/image'
import { useImageOptimization } from '@/hooks/useImageOptimization'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2, WifiOff, AlertCircle } from 'lucide-react'

interface OptimizedImageProps {
  src: string
  alt: string
  width: number
  height: number
  index?: number
  className?: string
  objectFit?: 'contain' | 'cover' | 'fill'
  priority?: boolean
  onLoadingComplete?: () => void
  onError?: (error: Error) => void
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  index = 0,
  className = '',
  objectFit = 'cover',
  priority: forcePriority,
  onLoadingComplete,
  onError,
}: OptimizedImageProps) {
  const { networkStatus, getImageConfig, retryCount } = useImageOptimization([src])
  const [error, setError] = useState<Error | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)

  // 이미지 설정 가져오기
  const config = getImageConfig(index)

  // 네트워크 상태 변경 감지
  useEffect(() => {
    if (networkStatus === 'offline' && !loaded) {
      const offlineError = new Error('오프라인 상태입니다')
      setError(offlineError)
      onError?.(offlineError)
    } else if (networkStatus !== 'offline' && error) {
      // 온라인 상태로 돌아왔을 때 자동으로 재시도
      handleRetry()
    }
  }, [networkStatus, loaded, error])

  // 재시도 처리
  const handleRetry = async () => {
    if (isRetrying) return

    setIsRetrying(true)
    setError(null)

    try {
      // 이미지 프리로드
      const img = new Image()
      await new Promise((resolve, reject) => {
        img.src = src
        img.onload = resolve
        img.onerror = reject
      })

      setLoaded(true)
      onLoadingComplete?.()
      
      if (retryCount > 0) {
        toast.success('이미지가 성공적으로 로드되었습니다')
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('이미지 로드 실패')
      setError(error)
      onError?.(error)
      
      if (networkStatus !== 'offline') {
        toast.error('이미지 로드에 실패했습니다. 다시 시도해주세요.')
      }
    } finally {
      setIsRetrying(false)
    }
  }

  if (error) {
    return (
      <div 
        className={`bg-gray-100 flex flex-col items-center justify-center ${className}`}
        style={{ width, height }}
      >
        {networkStatus === 'offline' ? (
          <>
            <WifiOff className="w-6 h-6 text-gray-400 mb-2" />
            <span className="text-sm text-gray-500">오프라인 상태입니다</span>
          </>
        ) : (
          <>
            <AlertCircle className="w-6 h-6 text-gray-400 mb-2" />
            <span className="text-sm text-gray-500">이미지를 불러올 수 없습니다</span>
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="mt-2 text-sm text-blue-500 hover:text-blue-600 disabled:text-gray-400"
            >
              {isRetrying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                '다시 시도'
              )}
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <NextImage
        src={src}
        alt={alt}
        width={width}
        height={height}
        quality={config.quality}
        priority={forcePriority || config.priority}
        loading={config.loading}
        className={`
          transition-opacity duration-300
          ${loaded ? 'opacity-100' : 'opacity-0'}
          ${objectFit === 'contain' ? 'object-contain' : 'object-cover'}
        `}
        onLoad={() => {
          setLoaded(true)
          onLoadingComplete?.()
        }}
        onError={(e) => {
          const error = e instanceof Error ? e : new Error('이미지 로드 실패')
          setError(error)
          onError?.(error)
        }}
      />
      
      {!loaded && !error && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      )}
    </div>
  )
} 