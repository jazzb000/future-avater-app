import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'

interface ImageStatus {
  imageId: string
  imageUrl: string
  status: 'processing' | 'completed' | 'error' | 'completed_with_fallback'
  errorMessage?: string
  completedAt?: string
}

export function useImageStatus(imageId: string | null) {
  const { user, loading: authLoading } = useAuth()
  const [status, setStatus] = useState<ImageStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // 인증 로딩 중이거나 조건이 불충족하면 대기
    if (authLoading) {
      console.log("🔍 useImageStatus: 인증 로딩 중 대기")
      return
    }

    if (!imageId || !user) {
      console.log("🔍 useImageStatus: 조건 불충족", { hasImageId: !!imageId, hasUser: !!user })
      setStatus(null)
      setLoading(false)
      return
    }

    let subscription: any = null

    const fetchInitialStatus = async () => {
      try {
        console.log("🔍 useImageStatus: 초기 상태 조회 시작", { imageId })
        setLoading(true)
        setError(null)
        
        // API 엔드포인트를 통해 상태 조회
        const response = await fetch(`/api/generate/status/${imageId}?userId=${user.id}`)
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error("❌ useImageStatus: API 상태 조회 오류:", errorData)
          setError(errorData.error || '상태 조회에 실패했습니다')
          setLoading(false)
          return
        }

        const result = await response.json()
        
        if (result.success && result.imageId) {
          console.log("✅ useImageStatus: API 상태 조회 완료", { 
            id: result.imageId, 
            status: result.status, 
            hasImageUrl: !!result.imageUrl 
          })
          const imageStatus: ImageStatus = {
            imageId: result.imageId,
            status: result.status || (result.imageUrl ? 'completed' : 'processing'),
            imageUrl: result.imageUrl || '',
            errorMessage: result.errorMessage || undefined,
            completedAt: result.completedAt
          }
          setStatus(imageStatus)
          
          // 처리 중인 경우에만 실시간 구독 시작
          if (imageStatus.status === 'processing') {
            subscribeToUpdates()
          }
        } else {
          console.log("⚠️ useImageStatus: 이미지 데이터 없음", { imageId })
          setError('이미지를 찾을 수 없습니다')
        }
      } catch (err) {
        console.error("❌ useImageStatus: 초기 상태 조회 중 오류:", err)
        setError('상태 조회 중 오류가 발생했습니다')
      } finally {
        setLoading(false)
      }
    }

    const subscribeToUpdates = () => {
      console.log("🔔 useImageStatus: 실시간 구독 시작", { imageId })
      
      try {
        subscription = supabase
          .channel(`generated-image-${imageId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'generated_images',
              filter: `id=eq.${imageId}`
            },
            (payload) => {
              console.log("🔄 useImageStatus: 실시간 업데이트 수신", { 
                imageId, 
                newStatus: payload.new?.status,
                hasImageUrl: !!payload.new?.image_url,
                fullPayload: payload.new
              })
              const newData = payload.new as any
              
              if (newData) {
                const updatedStatus: ImageStatus = {
                  imageId: newData.id,
                  status: newData.status || (newData.image_url ? 'completed' : 'processing'),
                  imageUrl: newData.image_url || '',
                  errorMessage: newData.error_message || undefined,
                  completedAt: newData.updated_at || newData.completed_at
                }
                console.log("✅ useImageStatus: 상태 업데이트 적용", updatedStatus)
                setStatus(updatedStatus)
                
                // 완료되면 구독 해제
                if (updatedStatus.status === 'completed' || updatedStatus.status === 'error') {
                  console.log("🔔 useImageStatus: 작업 완료로 구독 해제", { status: updatedStatus.status })
                  if (subscription) {
                    subscription.unsubscribe()
                    subscription = null
                  }
                }
              }
            }
          )
          .subscribe((status) => {
            console.log("🔔 useImageStatus: 구독 상태", { imageId, status })
            if (status === 'SUBSCRIBED') {
              console.log("✅ useImageStatus: 실시간 구독 성공", { imageId })
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
              console.error("❌ useImageStatus: 실시간 구독 실패", { imageId, status })
              // WebSocket 실패 시 폴백: 주기적 폴링으로 전환
              startPolling()
            }
          })
      } catch (err) {
        console.error("❌ useImageStatus: 구독 시작 중 오류:", err)
        // 실시간 구독 실패 시 폴백: 주기적 폴링으로 전환
        startPolling()
      }
    }
    
    const startPolling = () => {
      console.log("🔄 useImageStatus: 폴링 모드로 전환", { imageId })
      
      const pollInterval = setInterval(async () => {
        try {
          console.log("🔄 useImageStatus: 폴링 상태 확인", { imageId })
          const response = await fetch(`/api/generate/status/${imageId}?userId=${user.id}`)
          if (response.ok) {
            const result = await response.json()
            console.log("📥 useImageStatus: 폴링 응답", result)
            if (result.success && result.imageId) {
              const imageStatus: ImageStatus = {
                imageId: result.imageId,
                status: result.status || (result.imageUrl ? 'completed' : 'processing'),
                imageUrl: result.imageUrl || '',
                errorMessage: result.errorMessage || undefined,
                completedAt: result.completedAt
              }
              console.log("✅ useImageStatus: 폴링으로 상태 업데이트", imageStatus)
              setStatus(imageStatus)
              
              // 완료되면 폴링 중단
              if (imageStatus.status === 'completed' || imageStatus.status === 'error') {
                console.log("🔔 useImageStatus: 폴링 완료로 중단", { status: imageStatus.status })
                clearInterval(pollInterval)
              }
            }
          } else {
            console.error("❌ useImageStatus: 폴링 응답 오류", response.status, response.statusText)
          }
        } catch (err) {
          console.error("❌ useImageStatus: 폴링 중 오류:", err)
        }
      }, 2000) // 2초마다 폴링
      
      // 클린업 함수에서 폴링 정리
      return () => clearInterval(pollInterval)
    }

    fetchInitialStatus()

    return () => {
      if (subscription) {
        console.log("🔔 useImageStatus: 구독 해제", { imageId })
        subscription.unsubscribe()
      }
    }
  }, [imageId, user, authLoading])

  return { status, loading, error }
}

// SSE를 사용하는 대안 훅
export function useImageStatusSSE(imageId: string | null) {
  const [status, setStatus] = useState<ImageStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!imageId) {
      setLoading(false)
      return
    }

    const eventSource = new EventSource(`/api/generate/stream/${imageId}`)

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.error) {
          setError(data.error)
          setLoading(false)
          return
        }

        setStatus({
          imageId: data.imageId,
          imageUrl: data.imageUrl,
          status: data.status,
          errorMessage: data.errorMessage,
          completedAt: data.completedAt,
        })

        // 완료되면 로딩 상태 해제
        if (data.status === 'completed' || data.status === 'error' || data.status === 'completed_with_fallback') {
          setLoading(false)
          eventSource.close()
        }
      } catch (err) {
        console.error('SSE 데이터 파싱 오류:', err)
        setError('상태 업데이트 처리 중 오류가 발생했습니다')
        setLoading(false)
      }
    }

    eventSource.onerror = (err) => {
      console.error('SSE 연결 오류:', err)
      setError('실시간 상태 업데이트 연결에 실패했습니다')
      setLoading(false)
      eventSource.close()
    }

    // 정리 함수
    return () => {
      eventSource.close()
    }
  }, [imageId])

  return { status, loading, error }
} 