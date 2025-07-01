import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { sessionManager } from '@/lib/session-manager'
import { setupNetworkMonitoring } from '@/lib/utils'
import { toast } from 'sonner'

const RECONNECT_DELAY = 3000 // 3초
const MAX_SILENT_RETRIES = 2 // 사용자에게 알리지 않고 시도할 최대 횟수

export function useAutoReconnect() {
  const { user, signIn } = useAuth()
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [lastError, setLastError] = useState<Error | null>(null)

  const handleReconnect = useCallback(async () => {
    if (!sessionManager.isSessionValid()) {
      console.log('세션이 유효하지 않음')
      return false
    }

    try {
      setIsReconnecting(true)
      const sessionState = await sessionManager.getSessionState()
      
      // 세션 복구 시도
      const recovered = await sessionManager.recoverSession()
      if (!recovered) {
        throw new Error('세션 복구 실패')
      }

      // 자동 로그인 시도
      setRetryCount(0)
      setLastError(null)
      return true
    } catch (error) {
      setLastError(error as Error)
      setRetryCount(prev => prev + 1)
      return false
    } finally {
      setIsReconnecting(false)
    }
  }, [])

  // 네트워크 상태 변경 감지 및 처리
  useEffect(() => {
    const cleanup = setupNetworkMonitoring(async (isOnline, effectiveType) => {
      if (!isOnline || !user) return

      // 네트워크가 복구되었을 때 자동 재연결 시도
      if (retryCount < MAX_SILENT_RETRIES) {
        // 조용히 재시도
        await handleReconnect()
      } else {
        // 사용자에게 알림
        toast.error('연결이 불안정합니다. 다시 연결을 시도할까요?', {
          action: {
            label: '재연결',
            onClick: async () => {
              const success = await handleReconnect()
              if (success) {
                toast.success('성공적으로 재연결되었습니다')
              } else {
                toast.error('재연결에 실패했습니다. 다시 로그인해주세요.')
              }
            }
          }
        })
      }
    })

    return cleanup
  }, [user, retryCount, handleReconnect])

  // 주기적으로 세션 상태 확인
  useEffect(() => {
    if (!user) return

    const checkInterval = setInterval(async () => {
      const isValid = sessionManager.isSessionValid()
      if (!isValid && !isReconnecting) {
        if (retryCount < MAX_SILENT_RETRIES) {
          await handleReconnect()
        }
      }
    }, RECONNECT_DELAY)

    return () => clearInterval(checkInterval)
  }, [user, isReconnecting, retryCount, handleReconnect])

  return {
    isReconnecting,
    retryCount,
    lastError,
    handleReconnect
  }
} 