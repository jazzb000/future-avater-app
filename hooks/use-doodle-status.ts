import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'

interface DoodleImageStatus {
  id: string
  status: 'processing' | 'completed' | 'error'
  imageUrl?: string
  errorMessage?: string
  updated_at: string
}

export function useDoodleStatus(imageId: string | null) {
  const { user, loading: authLoading } = useAuth()
  const [status, setStatus] = useState<DoodleImageStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // 인증 로딩 중이거나 조건이 불충족하면 대기
    if (authLoading) {
      console.log("🔍 useDoodleStatus: 인증 로딩 중 대기")
      return
    }

    if (!imageId || !user) {
      console.log("🔍 useDoodleStatus: 조건 불충족", { hasImageId: !!imageId, hasUser: !!user })
      setStatus(null)
      setLoading(false)
      return
    }

    let subscription: any = null

    const fetchInitialStatus = async () => {
      try {
        console.log("🔍 useDoodleStatus: 초기 상태 조회 시작", { imageId })
        setLoading(true)
        setError(null)
        
        const { data, error: fetchError } = await supabase
          .from('doodle_images')
          .select('id, result_image_url, status, error_message, created_at, updated_at')
          .eq('id', imageId)
          .eq('user_id', user.id)
          .single()

        if (fetchError) {
          console.error("❌ useDoodleStatus: 초기 상태 조회 오류:", fetchError)
          setError(fetchError.message)
          setLoading(false)
          return
        }

        if (data) {
          console.log("✅ useDoodleStatus: 초기 상태 조회 완료", { 
            id: data.id, 
            status: data.status, 
            hasImageUrl: !!data.result_image_url 
          })
          // 상태에 따라 이미지 상태 결정
          const imageStatus: DoodleImageStatus = {
            id: data.id,
            status: data.status || (data.result_image_url ? 'completed' : 'processing'),
            imageUrl: data.result_image_url || undefined,
            errorMessage: data.error_message || undefined,
            updated_at: data.updated_at
          }
          setStatus(imageStatus)
          
          // 처리 중인 경우에만 실시간 구독 시작
          if (imageStatus.status === 'processing') {
            subscribeToUpdates()
          }
        } else {
          console.log("⚠️ useDoodleStatus: 이미지 데이터 없음", { imageId })
          setError('이미지를 찾을 수 없습니다')
        }
      } catch (err) {
        console.error("❌ useDoodleStatus: 초기 상태 조회 중 오류:", err)
        setError('상태 조회 중 오류가 발생했습니다')
      } finally {
        setLoading(false)
      }
    }

    const subscribeToUpdates = () => {
      console.log("🔔 useDoodleStatus: 실시간 구독 시작", { imageId })
      subscription = supabase
        .channel(`doodle-image-${imageId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'doodle_images',
            filter: `id=eq.${imageId}`
          },
          (payload) => {
            console.log("🔄 useDoodleStatus: 실시간 업데이트 수신", { 
              imageId, 
              newStatus: payload.new?.status,
              hasImageUrl: !!payload.new?.result_image_url 
            })
            const newData = payload.new as any
            
            if (newData) {
              const updatedStatus: DoodleImageStatus = {
                id: newData.id,
                status: newData.status || (newData.result_image_url ? 'completed' : 'processing'),
                imageUrl: newData.result_image_url || undefined,
                errorMessage: newData.error_message || undefined,
                updated_at: newData.updated_at
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
          console.log("🔔 useDoodleStatus: 구독 상태", { imageId, status })
          if (status === 'SUBSCRIBED') {
            console.log("✅ useDoodleStatus: 실시간 구독 성공", { imageId })
          } else if (status === 'CHANNEL_ERROR') {
            console.error("❌ useDoodleStatus: 실시간 구독 실패", { imageId })
          }
        })
    }

    fetchInitialStatus()

    return () => {
      if (subscription) {
        console.log("🔔 useDoodleStatus: 구독 해제", { imageId })
        subscription.unsubscribe()
      }
    }
  }, [imageId, user, authLoading])

  return { status, loading, error }
} 