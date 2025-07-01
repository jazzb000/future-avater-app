import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isMobile(): boolean {
  if (typeof window === 'undefined') return false
  
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.innerWidth <= 768
  )
}

export function isStorageAvailable(type: 'localStorage' | 'sessionStorage'): boolean {
  try {
    const storage = window[type]
    const x = '__storage_test__'
    storage.setItem(x, x)
    storage.removeItem(x)
    return true
  } catch (e) {
    return (
      e instanceof DOMException &&
      // Firefox에서 쿼터 초과시
      (e.name === 'QuotaExceededError' ||
        // Chrome에서 쿼터 초과시
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        // Safari private 모드
        e.name === 'QuotaExceededError' ||
        // iOS Safari private 모드
        e.name === 'QUOTA_EXCEEDED_ERR')
    )
  }
}

export function getStorageEstimate(): Promise<{ quota: number; usage: number }> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    return navigator.storage.estimate() as Promise<{ quota: number; usage: number }>
  }
  
  return Promise.resolve({ quota: 0, usage: 0 })
}

export async function clearOldStorageData(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
  try {
    const keys = Object.keys(localStorage)
    const now = Date.now()

    for (const key of keys) {
      try {
        const value = localStorage.getItem(key)
        if (!value) continue

        const data = JSON.parse(value)
        if (data.timestamp && now - data.timestamp > maxAge) {
          localStorage.removeItem(key)
        }
      } catch {
        // JSON 파싱 실패한 항목은 건너뛰기
        continue
      }
    }
  } catch (error) {
    console.warn('오래된 스토리지 데이터 정리 중 오류:', error)
  }
}

export async function optimizeStorageForMobile(): Promise<void> {
  if (!isMobile()) return

  try {
    const { usage, quota } = await getStorageEstimate()
    const usageRatio = usage / quota

    // 스토리지 사용량이 80% 이상이면 오래된 데이터 정리
    if (usageRatio > 0.8) {
      await clearOldStorageData()
    }
  } catch (error) {
    console.warn('모바일 스토리지 최적화 중 오류:', error)
  }
}

export function getCachePreference(): 'force-cache' | 'no-store' {
  if (isMobile()) {
    // 모바일에서는 네트워크 상태에 따라 캐시 정책 결정
    if ('connection' in navigator && (navigator as any).connection) {
      const connection = (navigator as any).connection
      if (connection.saveData || connection.effectiveType !== '4g') {
        return 'force-cache'
      }
    }
  }
  return 'no-store'
}

// 네트워크 상태 모니터링
export function setupNetworkMonitoring(
  onNetworkChange: (isOnline: boolean, effectiveType?: string) => void
): () => void {
  const handleOnline = () => onNetworkChange(true)
  const handleOffline = () => onNetworkChange(false)
  
  let connectionHandler: (() => void) | undefined

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  if ('connection' in navigator) {
    const connection = (navigator as any).connection
    connectionHandler = () => {
      onNetworkChange(navigator.onLine, connection.effectiveType)
    }
    connection.addEventListener('change', connectionHandler)
  }

  // 클린업 함수 반환
  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
    if (connectionHandler && 'connection' in navigator) {
      ;(navigator as any).connection.removeEventListener('change', connectionHandler)
    }
  }
}
