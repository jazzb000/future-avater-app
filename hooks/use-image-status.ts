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
        
        const { data, error: fetchError } = await supabase
          .from('generated_images')
          .select('id, image_url, status, error_message, created_at, updated_at, completed_at')
          .eq('id', imageId)
          .eq('user_id', user.id)
          .single()

        if (fetchError) {
          console.error("❌ useImageStatus: 초기 상태 조회 오류:", fetchError)
          setError(fetchError.message)
          setLoading(false)
          return
        }

        if (data) {
          console.log("✅ useImageStatus: 초기 상태 조회 완료", { 
            id: data.id, 
            status: data.status, 
            hasImageUrl: !!data.image_url 
          })
          // 상태에 따라 이미지 상태 결정
          const imageStatus: ImageStatus = {
            imageId: data.id,
            status: data.status || (data.image_url ? 'completed' : 'processing'),
            imageUrl: data.image_url || '',
            errorMessage: data.error_message || undefined,
            completedAt: data.completed_at || data.updated_at
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
                hasImageUrl: !!payload.new?.image_url 
              })
              const newData = payload.new as any
              
              if (newData) {
                const updatedStatus: ImageStatus = {
                  imageId: newData.id,
                  status: newData.status || (newData.image_url ? 'completed' : 'processing'),
                  imageUrl: newData.image_url || '',
                  errorMessage: newData.error_message || undefined,
                  completedAt: newData.updated_at
                }
                setStatus(updatedStatus)
                
                // 완료되면 구독 해제
                if (updatedStatus.status === 'completed' || updatedStatus.status === 'error') {
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
            } else if (status === 'CHANNEL_ERROR') {
              console.error("❌ useImageStatus: 실시간 구독 실패", { imageId })
            }
          })
      } catch (err) {
        console.error("❌ useImageStatus: 구독 시작 중 오류:", err)
      }
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