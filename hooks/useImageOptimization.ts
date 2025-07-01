import { useState, useEffect } from 'react'

type NetworkStatus = 'fast' | 'slow' | 'offline'
type ImageQualityConfig = {
  quality: number
  priority: boolean
  loading: 'lazy' | 'eager'
}

const RETRY_INTERVALS = {
  fast: 3000,   // 3초
  slow: 5000,   // 5초
  offline: 10000 // 10초
}

const MAX_RETRY_ATTEMPTS = 3

export const useImageOptimization = (imageUrls: string[]) => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>('fast')
  const [preloadedImages, setPreloadedImages] = useState<string[]>([])
  const [retryCount, setRetryCount] = useState(0)

  // 네트워크 상태 감지
  useEffect(() => {
    const checkConnection = () => {
      if (!navigator.onLine) {
        setNetworkStatus('offline')
        return
      }

      // Connection API 지원 확인
      if ('connection' in navigator) {
        const conn = (navigator as any).connection
        if (conn) {
          if (conn.effectiveType === '4g') {
            setNetworkStatus('fast')
          } else {
            setNetworkStatus('slow')
          }
        }
      }
    }

    window.addEventListener('online', checkConnection)
    window.addEventListener('offline', checkConnection)
    if ('connection' in navigator) {
      ;(navigator as any).connection?.addEventListener('change', checkConnection)
    }

    checkConnection()

    return () => {
      window.removeEventListener('online', checkConnection)
      window.removeEventListener('offline', checkConnection)
      if ('connection' in navigator) {
        ;(navigator as any).connection?.removeEventListener('change', checkConnection)
      }
    }
  }, [])

  // 이미지 프리로딩
  useEffect(() => {
    const preloadImages = async () => {
      const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768
      // 모바일에서는 4개, PC에서는 8개까지 프리로드
      const maxPreloadImages = isMobile ? 4 : 8
      const imagesToPreload = imageUrls.slice(0, maxPreloadImages)
      
      const preloadPromises = imagesToPreload.map((url) => {
        return new Promise((resolve, reject) => {
          const img = new Image()
          
          const retryLoad = async (attempt = 0) => {
            try {
              img.src = url
              img.onload = () => resolve(url)
              img.onerror = async () => {
                if (attempt < MAX_RETRY_ATTEMPTS) {
                  const interval = RETRY_INTERVALS[networkStatus]
                  await new Promise(r => setTimeout(r, interval))
                  retryLoad(attempt + 1)
                } else {
                  reject(new Error(`Failed to load image after ${MAX_RETRY_ATTEMPTS} attempts`))
                }
              }
            } catch (error) {
              reject(error)
            }
          }

          retryLoad()
        })
      })

      try {
        const loadedImages = await Promise.all(preloadPromises)
        setPreloadedImages(loadedImages as string[])
        setRetryCount(0) // 성공 시 재시도 카운트 리셋
      } catch (error) {
        console.warn('이미지 프리로딩 중 오류:', error)
        setRetryCount(prev => prev + 1)
      }
    }

    if (networkStatus !== 'offline' && imageUrls.length > 0) {
      preloadImages()
    }
  }, [imageUrls, networkStatus])

  // 이미지 품질 설정
  const getImageConfig = (index: number): ImageQualityConfig => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768
    const isPreloaded = preloadedImages.includes(imageUrls[index])

    // 기본 설정
    const config: ImageQualityConfig = {
      quality: isMobile ? 70 : 80,
      priority: false,
      loading: 'lazy'
    }

    // 네트워크 상태에 따른 조정
    if (networkStatus === 'slow') {
      config.quality = isMobile ? 50 : 60 // 더 낮은 품질로 조정
    }

    // 처음 4개(모바일) 또는 8개(PC) 이미지는 priority로 설정
    const maxPriorityImages = isMobile ? 4 : 8
    if (index < maxPriorityImages) {
      config.priority = true
      config.loading = 'eager'
    }

    // 프리로드된 이미지는 높은 품질로 설정
    if (isPreloaded) {
      config.quality = isMobile ? 75 : 85
    }

    return config
  }

  return {
    networkStatus,
    preloadedImages,
    getImageConfig,
    retryCount
  }
} 